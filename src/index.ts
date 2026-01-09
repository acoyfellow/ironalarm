// ironalarm: Effect-powered Reliable task scheduling for Cloudflare Durable Objects
// Implements Kenton Varda's "reliable runNow" pattern with Effect-TS internals

import { Effect, Data, Context, Layer, Schedule, Duration } from "effect";

type TaskStatus = "pending" | "running" | "completed" | "failed" | "paused";

interface Task {
  taskId: string;
  taskName: string;
  params: unknown;
  scheduledAt: number;
  startedAt: number; // Original start time, never changes
  status: TaskStatus;
  safetyAlarmAt?: number;
  progress: Record<string, unknown>;
  maxRetries?: number;
  pausedAt?: number;
  totalPausedMs?: number;
  priority?: number; // 0=high, 1=medium, 2=low (default: 1)
}

// Define the service interface type
export type SchedulerServiceType = {
  checkpoint: (taskId: string, key: string, value: unknown) => Effect.Effect<void, never, never>;
  completeTask: (taskId: string) => Effect.Effect<void, never, never>;
  schedule: (at: Date | number, taskId: string, taskName: string, params: unknown, options?: { priority?: number }) => Effect.Effect<void, HandlerMissing | ValidationError | TaskLimitExceeded, never>;
  runNow: (taskId: string, taskName: string, params?: unknown, options?: { maxRetries?: number; priority?: number }) => Effect.Effect<void, HandlerMissing | ValidationError | TaskLimitExceeded, never>;
  getTask: (taskId: string) => Effect.Effect<Task | undefined, never, never>;
  getTasks: (status?: TaskStatus) => Effect.Effect<Task[], never, never>;
  getCheckpoint: (taskId: string, key: string) => Effect.Effect<unknown, never, never>;
  checkpointMultiple: (taskId: string, updates: Record<string, unknown>) => Effect.Effect<void, never, never>;
  pauseTask: (taskId: string) => Effect.Effect<boolean, never, never>;
  resumeTask: (taskId: string) => Effect.Effect<boolean, never, never>;
  cancelTask: (taskId: string) => Effect.Effect<boolean, never, never>;
  clearCompleted: () => Effect.Effect<number, never, never>;
  clearAll: () => Effect.Effect<number, never, never>;
  runSteps: (taskId: string, steps: string[], options: { stepDuration?: number; onStep?: (stepName: string, stepIndex: number) => Promise<void> | Effect.Effect<void>; result?: string; autoComplete?: boolean }) => Effect.Effect<void, never, never>;
  runSubSteps: (taskId: string, stepName: string, stepIndex: number, totalSteps: number, subStepCount: number, subStepDuration: number, onSubStep?: (subStepIndex: number) => Promise<void> | Effect.Effect<void>) => Effect.Effect<void, never, never>;
  getCachedTasks: (status?: TaskStatus) => Task[];
  formatTaskForUI: (task: Task) => any;
};

type TaskHandler = (
  taskId: string,
  params: unknown
) => Effect.Effect<void, unknown, SchedulerServiceType>;



class HandlerMissing extends Data.TaggedError("HandlerMissing")<{ taskName: string }> { }
class TaskNotFound extends Data.TaggedError("TaskNotFound")<{ taskId: string }> { }
class TaskConflict extends Data.TaggedError("TaskConflict")<{ taskId: string; currentStatus: string; operation: string }> { }
class ValidationError extends Data.TaggedError("ValidationError")<{ field: string; value: string; reason: string }> { }
class TaskLimitExceeded extends Data.TaggedError("TaskLimitExceeded")<{ maxTotalTasks: number; currentCount: number }> { }

// Re-export errors for public use
export { HandlerMissing, TaskNotFound, TaskConflict, ValidationError, TaskLimitExceeded };

function validateTaskIdentifier(value: string, fieldName: string): Effect.Effect<void, ValidationError, never> {
  if (!value || value.trim().length === 0) {
    return Effect.fail(new ValidationError({
      field: fieldName,
      value,
      reason: `${fieldName} cannot be empty`
    }));
  }

  if (value.length > 128) {
    return Effect.fail(new ValidationError({
      field: fieldName,
      value,
      reason: `${fieldName} cannot be longer than 128 characters`
    }));
  }

  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(value)) {
    return Effect.fail(new ValidationError({
      field: fieldName,
      value,
      reason: `${fieldName} can only contain alphanumeric characters, hyphens, and underscores`
    }));
  }

  return Effect.void;
}

// SchedulerService for dependency injection - allows handlers to access scheduler methods via Context
const SchedulerService = Context.GenericTag<SchedulerServiceType>("SchedulerService");

export { SchedulerService };


export class ReliableScheduler {
  private storage: DurableObjectStorage;
  private handlers: Map<string, TaskHandler> = new Map();
  private taskCache: Map<string, Task> | null = null;
  private cacheValid = false;
  private maxConcurrentTasks: number;
  private maxTotalTasks: number;

  /**
   * Creates a new scheduler instance with the provided Durable Object storage.
   * @param storage - Durable Object storage instance
   * @param options - Optional configuration
   * @param options.maxConcurrentTasks - Maximum number of tasks to process concurrently (default: 10)
   * @param options.maxTotalTasks - Maximum total tasks allowed (default: 10000)
   */
  constructor(storage: DurableObjectStorage, options?: { maxConcurrentTasks?: number; maxTotalTasks?: number }) {
    this.storage = storage;
    this.maxConcurrentTasks = options?.maxConcurrentTasks ?? 10;
    this.maxTotalTasks = options?.maxTotalTasks ?? 10000;
  }

  /**
   * Creates a Layer that provides SchedulerService with this scheduler instance.
   * Used to provide the service context when running task handlers.
   */
  _createServiceLayer(): Layer.Layer<never, never, typeof SchedulerService> {
    return Layer.succeed(SchedulerService, {
      checkpoint: (taskId: string, key: string, value: unknown) =>
        this._checkpoint(taskId, key, value),
      completeTask: (taskId: string) => this._completeTask(taskId),
      schedule: (at: Date | number, taskId: string, taskName: string, params: unknown, options?: { priority?: number }) =>
        this._schedule(at, taskId, taskName, params, options),
      runNow: (taskId: string, taskName: string, params?: unknown, options?: { maxRetries?: number; priority?: number }) =>
        this._runNow(taskId, taskName, params, options),
      getTask: (taskId: string) => this._getTask(taskId),
      getTasks: (status?: TaskStatus) => this._getTasks(status),
      getCheckpoint: (taskId: string, key: string) => this._getCheckpoint(taskId, key),
      checkpointMultiple: (taskId: string, updates: Record<string, unknown>) =>
        this._checkpointMultiple(taskId, updates),
      pauseTask: (taskId: string) => this._pauseTask(taskId),
      resumeTask: (taskId: string) => this._resumeTask(taskId),
      cancelTask: (taskId: string) => this._cancelTask(taskId),
      clearCompleted: () => this._clearCompleted(),
      clearAll: () => this._clearAll(),
      runSteps: (taskId: string, steps: string[], options?: { stepDuration?: number; onStep?: (stepName: string, stepIndex: number) => Promise<void> | Effect.Effect<void>; result?: string; autoComplete?: boolean }) =>
        this._runSteps(taskId, steps, options || {}),
      runSubSteps: (taskId: string, stepName: string, stepIndex: number, totalSteps: number, subStepCount: number, subStepDuration: number, onSubStep?: (subStepIndex: number) => Promise<void> | Effect.Effect<void>) =>
        this._runSubSteps(taskId, stepName, stepIndex, totalSteps, subStepCount, subStepDuration, onSubStep),
      getCachedTasks: (status?: TaskStatus) => this.getCachedTasks(status),
      formatTaskForUI: (task: Task) => this.formatTaskForUI(task),
    });
  }

  /**
   * Register a named task handler. The handler receives taskId and params,
   * and can access SchedulerService via yield* SchedulerService in Effect context.
   */
  register(taskName: string, handler: TaskHandler): void {
    this.handlers.set(taskName, handler);
  }

  /**
   * Get a registered handler by name. Returns undefined if not found.
   */
  getHandler(taskName: string): TaskHandler | undefined {
    return this.handlers.get(taskName);
  }

  /**
     * Schedule a task to run at a future time (Unix timestamp or Date).
     * @param options.priority - Task priority: 0=high, 1=medium, 2=low (default: 1)
     */
  schedule(
    at: Date | number,
    taskId: string,
    taskName: string,
    params: unknown = {},
    options?: { priority?: number }
  ): Effect.Effect<void, HandlerMissing | ValidationError | TaskLimitExceeded, never> {
    return this._schedule(at, taskId, taskName, params, options);
  }

  private _schedule(
    at: Date | number,
    taskId: string,
    taskName: string,
    params: unknown,
    options?: { priority?: number }
  ) {
    return Effect.gen(this, function* () {
      yield* validateTaskIdentifier(taskId, "taskId");
      yield* validateTaskIdentifier(taskName, "taskName");

      if (!this.handlers.has(taskName)) {
        yield* new HandlerMissing({ taskName });
      }

      const totalTasks = yield* this._getTotalTaskCount();
      if (totalTasks >= this.maxTotalTasks) {
        yield* new TaskLimitExceeded({ maxTotalTasks: this.maxTotalTasks, currentCount: totalTasks });
      }

      const scheduledAt = typeof at === "number" ? at : at.getTime();

      // Check if task already exists - if so, preserve its state (for rescheduling loops)
      const existingTask = yield* Effect.promise(() =>
        this.storage.get<Task>(`task:${taskId}`)
      );

      const now = Date.now();
      const task: Task = existingTask
        ? {
          // Preserve existing task state when rescheduling
          ...existingTask,
          taskName,
          params,
          scheduledAt,
          // Keep original startedAt, don't reset it
          // Preserve status if running, otherwise set to pending
          status: existingTask.status === "running" ? "running" : "pending",
          // Preserve progress/checkpoints
          // Update priority if provided, otherwise preserve existing
          priority: options?.priority ?? existingTask.priority ?? 1,
        }
        : {
          // New task
          taskId,
          taskName,
          params,
          scheduledAt,
          startedAt: now,
          status: "pending",
          progress: {},
          priority: options?.priority ?? 1,
        };

      // Invalidate cache BEFORE transaction so queue rebuild uses fresh data
      this.invalidateCache();

      yield* Effect.promise(() =>
        this.storage.transaction(async (txn: any) => {
          await txn.put(`task:${taskId}`, task);
          await this._rebuildQueueSync(txn);
          await this._updateAlarmSync(txn);
        })
      );

      if (scheduledAt <= Date.now()) {
        yield* Effect.promise(() => this._processTaskAsync(taskId));
      }
    });
  }

  /**
   * Start a task immediately with eviction safety. Sets a 30s safety alarm for automatic retry.
   * @param options.maxRetries - Override default retry count (default: 3, use Infinity for infinite loop tasks)
   * @param options.priority - Task priority: 0=high, 1=medium, 2=low (default: 1)
   */
  runNow(
    taskId: string,
    taskName: string,
    params: unknown = {},
    options?: { maxRetries?: number; priority?: number }
  ): Effect.Effect<void, HandlerMissing | ValidationError | TaskLimitExceeded, never> {
    return this._runNow(taskId, taskName, params, options);
  }

  private _runNow(taskId: string, taskName: string, params: unknown, options?: { maxRetries?: number; priority?: number }) {
    return Effect.gen(this, function* () {
      yield* validateTaskIdentifier(taskId, "taskId");
      yield* validateTaskIdentifier(taskName, "taskName");

      if (!this.handlers.has(taskName)) {
        yield* new HandlerMissing({ taskName });
      }

      const totalTasks = yield* this._getTotalTaskCount();
      if (totalTasks >= this.maxTotalTasks) {
        yield* new TaskLimitExceeded({ maxTotalTasks: this.maxTotalTasks, currentCount: totalTasks });
      }

      const now = Date.now();
      const safetyDelay = 30000;
      const safetyAt = now + safetyDelay;

      const task: Task = {
        taskId,
        taskName,
        params,
        scheduledAt: now,
        startedAt: now,
        status: "running",
        safetyAlarmAt: safetyAt,
        progress: {},
        maxRetries: options?.maxRetries,
        priority: options?.priority ?? 1,
      };

      yield* Effect.promise(() =>
        this.storage.transaction(async (txn: any) => {
          await txn.put(`task:${taskId}`, task);
          await this._rebuildQueueSync(txn);
          await this._updateAlarmSync(txn);
          await txn.setAlarm(safetyAt);
        })
      );
      this.invalidateCache();

      void this._processTaskAsync(taskId);
    });
  }

  /**
   * Save progress for a task. Use this to mark completion of expensive operations.
   */
  checkpoint(
    taskId: string,
    key: string,
    value: unknown
  ): Effect.Effect<void, never, never> {
    return this._checkpoint(taskId, key, value);
  }

  private _checkpoint(taskId: string, key: string, value: unknown) {
    return Effect.gen(this, function* () {
      const updated = yield* this._updateTask(taskId, (task) => {
        // Allow checkpoints on pending (for initialization), running, completed, or failed tasks
        // Failed tasks can be checkpointed to allow recovery (especially for global-state)
        // Pending tasks can be checkpointed for initialization (e.g., global-state setup)
        if (task.status !== "pending" && task.status !== "running" && task.status !== "completed" && task.status !== "failed") {
          // Note: Can't use Effect.log here inside synchronous callback, but this is an edge case
          return false;
        }
        // If task is pending, mark it as running (initialization checkpoint)
        if (task.status === "pending") {
          task.status = "running";
        }
        // If task is failed, mark it as running again to allow recovery
        if (task.status === "failed") {
          task.status = "running";
          if (task.progress.error) {
            delete task.progress.error;
          }
        }
        task.progress[key] = value;
        return true;
      });
      if (updated) {
        this.invalidateCache();
      } else {
        yield* Effect.logWarning(`[checkpoint] Failed to update checkpoint ${key} for task ${taskId}`);
      }
    });
  }

  /**
   * Retrieve saved progress for a task. Returns undefined if not found.
   */
  getCheckpoint(taskId: string, key: string): Effect.Effect<unknown, never, never> {
    return this._getCheckpoint(taskId, key);
  }

  /**
   * Batch multiple checkpoint updates into a single write operation.
   * Accepts an object of key-value pairs to update.
   */
  checkpointMultiple(taskId: string, updates: Record<string, unknown>): Effect.Effect<void, never, never> {
    return this._checkpointMultiple(taskId, updates);
  }

  private _checkpointMultiple(taskId: string, updates: Record<string, unknown>) {
    return Effect.gen(this, function* () {
      const updated = yield* this._updateTask(taskId, (task) => {
        // Allow checkpoints on pending (for initialization), running, completed, or failed tasks
        if (task.status !== "pending" && task.status !== "running" && task.status !== "completed" && task.status !== "failed") {
          // Note: Can't use Effect.log here inside synchronous callback, but this is an edge case
          return false;
        }
        // If task is pending, mark it as running (initialization checkpoint)
        if (task.status === "pending") {
          task.status = "running";
        }
        // If task is failed, mark it as running again to allow recovery
        if (task.status === "failed") {
          task.status = "running";
          if (task.progress.error) {
            delete task.progress.error;
          }
        }
        // Update all checkpoint values in a single operation
        Object.assign(task.progress, updates);
        return true;
      });
      if (updated) {
        this.invalidateCache();
      } else {
        yield* Effect.logWarning(`[checkpointMultiple] Failed to update checkpoints for task ${taskId}`);
      }
    });
  }

  private _getCheckpoint(taskId: string, key: string) {
    return Effect.gen(this, function* () {
      const task = yield* Effect.promise(() =>
        this.storage.get<Task>(`task:${taskId}`)
      );
      return task?.progress[key];
    });
  }

  /**
   * Mark a task as complete and clean up its state.
   */
  completeTask(taskId: string): Effect.Effect<void, never, never> {
    return this._completeTask(taskId);
  }

  private _completeTask(taskId: string) {
    return Effect.gen(this, function* () {
      const updated = yield* this._updateTask(taskId, (task) => {
        task.status = "completed";
        task.progress.completed = true;
        return true;
      });
      if (updated) {
        this.invalidateCache();
      }
    });
  }

  /**
   * Get a single task by ID. Returns undefined if not found.
   */
  getTask(taskId: string): Effect.Effect<Task | undefined, never, never> {
    return this._getTask(taskId);
  }

  private _getTask(taskId: string) {
    return Effect.promise(() => this.storage.get<Task>(`task:${taskId}`));
  }

  /**
   * Get all tasks, optionally filtered by status.
   */
  getTasks(status?: TaskStatus): Effect.Effect<Task[], never, never> {
    return this._getTasks(status);
  }

  /**
   * Recover stuck tasks that are overdue (scheduled >1 minute ago).
   * Call this in your DO's fetch() and alarm() methods to handle hibernation recovery.
   * 
   * @param taskNames - Optional array of task names to check. If not provided, checks all running tasks.
   * @returns Number of tasks recovered
   */
  recoverStuckTasks(taskNames?: string[]): Effect.Effect<number, never, never> {
    return this._recoverStuckTasks(taskNames);
  }

  private _recoverStuckTasks(taskNames?: string[]): Effect.Effect<number, never, never> {
    return Effect.gen(this, function* () {
      const now = Date.now();
      const tasks = yield* this._getTasks();
      let recovered = 0;

      for (const task of tasks) {
        // Only check specified task names, or all running tasks
        if (taskNames && !taskNames.includes(task.taskName)) continue;
        if (task.status !== "running" && task.status !== "failed" && task.status !== "completed" && task.status !== "pending") continue;

        // Recover failed/completed tasks
        if (task.status === "failed" || task.status === "completed") {
          yield* this._checkpoint(task.taskId, "_recovered", true);
          recovered++;
          continue;
        }

        // Reschedule if stuck (scheduled >5 seconds ago OR never scheduled)
        if (task.status === "running" || task.status === "pending") {
          const scheduledAt = task.scheduledAt || 0;
          const isStuck = scheduledAt === 0 || (scheduledAt > 0 && now > scheduledAt + 5000);

          if (isStuck) {
            // Reschedule for immediate execution - use _schedule directly to avoid handler check
            // Set to now - 1ms so it's immediately due (not now + 100 which delays it)
            const newScheduledAt = now - 1;
            const existingTask = yield* Effect.promise(() =>
              this.storage.get<Task>(`task:${task.taskId}`)
            );
            if (existingTask) {
              const reason = scheduledAt === 0 ? "never scheduled" : `${Math.round((now - scheduledAt) / 1000)}s overdue`;
              yield* Effect.log(`[recoverStuckTasks] Recovering task ${task.taskId} (${task.taskName}): ${reason}, rescheduling for immediate execution`);
              existingTask.scheduledAt = newScheduledAt;
              existingTask.status = "pending";
              yield* Effect.promise(() => this.storage.put(`task:${task.taskId}`, existingTask));
              this.invalidateCache();
              yield* Effect.promise(() =>
                this.storage.transaction(async (txn: any) => {
                  await this._rebuildQueueSync(txn);
                  await this._updateAlarmSync(txn);
                })
              );
              recovered++;
            }
          }
        }
      }

      return recovered;
    });
  }

  /**
   * Get cached tasks if available, otherwise load from storage.
   * This is more efficient than getTasks() when cache is valid.
   */
  getCachedTasks(status?: TaskStatus): Task[] {
    if (!this.cacheValid || !this.taskCache) {
      // Cache not available, return empty array (caller should use getTasks())
      return [];
    }
    const tasks: Task[] = [];
    for (const task of this.taskCache.values()) {
      if (!status || task.status === status) {
        tasks.push(task);
      }
    }
    return tasks;
  }

  private _getTasks(status?: TaskStatus) {
    return Effect.gen(this, function* () {
      // Use cached tasks if available and valid, otherwise load from storage
      if (!this.cacheValid || !this.taskCache) {
        const list = yield* Effect.promise(() =>
          this.storage.list({ prefix: "task:" })
        );
        this.taskCache = new Map();
        for (const [key, value] of list) {
          const taskId = key.substring(5); // Remove "task:" prefix
          this.taskCache.set(taskId, value as Task);
        }
        this.cacheValid = true;
      }

      const tasks: Task[] = [];
      for (const task of this.taskCache.values()) {
        if (!status || task.status === status) {
          tasks.push(task);
        }
      }
      return tasks;
    });
  }

  private _getTotalTaskCount() {
    return Effect.gen(this, function* () {
      // Use cached tasks if available and valid, otherwise load from storage
      if (!this.cacheValid || !this.taskCache) {
        const list = yield* Effect.promise(() =>
          this.storage.list({ prefix: "task:" })
        );
        this.taskCache = new Map();
        for (const [key, value] of list) {
          const taskId = key.substring(5); // Remove "task:" prefix
          this.taskCache.set(taskId, value as Task);
        }
        this.cacheValid = true;
      }

      return this.taskCache.size;
    });
  }

  /**
   * Cancel and delete a task. Returns true if successful, false if task not found.
   */
  cancelTask(taskId: string): Effect.Effect<boolean, never, never> {
    return this._cancelTask(taskId);
  }

  private _cancelTask(taskId: string) {
    return Effect.gen(this, function* () {
      const task = yield* Effect.promise(() =>
        this.storage.get<Task>(`task:${taskId}`)
      );
      if (!task) return false;

      yield* Effect.promise(() => this.storage.delete(`task:${taskId}`));
      this.invalidateCache();

      yield* Effect.promise(() =>
        this.storage.transaction(async (txn: any) => {
          await this._rebuildQueueSync(txn);
          await this._updateAlarmSync(txn);
        })
      );

      return true;
    });
  }

  /**
   * Pause a running task. Returns true if successful, false if task not found or cannot be paused.
   */
  pauseTask(taskId: string): Effect.Effect<boolean, never, never> {
    return this._pauseTask(taskId);
  }

  private _pauseTask(taskId: string) {
    return Effect.gen(this, function* () {
      const updated = yield* this._updateTask(taskId, (task) => {
        if (
          task.status === "completed" ||
          task.status === "failed" ||
          task.status === "paused"
        )
          return false;
        task.status = "paused";
        task.pausedAt = Date.now();
        return true;
      });

      if (updated) {
        this.invalidateCache();
        yield* Effect.promise(() =>
          this.storage.transaction(async (txn: any) => {
            await this._rebuildQueueSync(txn);
            await this._updateAlarmSync(txn);
          })
        );
      }

      return updated;
    });
  }

  /**
   * Resume a paused task. Returns true if successful, false if task not found or not paused.
   */
  resumeTask(taskId: string): Effect.Effect<boolean, never, never> {
    return this._resumeTask(taskId);
  }

  private _resumeTask(taskId: string) {
    return Effect.gen(this, function* () {
      const updated = yield* this._updateTask(taskId, (task) => {
        if (task.status !== "paused") return false;

        if (task.pausedAt) {
          const pauseDuration = Date.now() - task.pausedAt;
          task.totalPausedMs = (task.totalPausedMs ?? 0) + pauseDuration;
        }

        task.status = "running";
        task.pausedAt = undefined;
        // Don't touch startedAt - it's the original start time
        // Set a new safety alarm
        task.safetyAlarmAt = Date.now() + 30000;
        return true;
      });

      if (updated) {
        this.invalidateCache();
        yield* Effect.promise(() =>
          this.storage.transaction(async (txn: any) => {
            await this._rebuildQueueSync(txn);
            await this._updateAlarmSync(txn);
          })
        );
        // Actually resume execution
        void this._processTaskAsync(taskId);
      }

      return updated;
    });
  }

  /**
   * Delete all completed tasks. Returns the count of deleted tasks.
   */
  clearCompleted(): Effect.Effect<number, never, never> {
    return this._clearCompleted();
  }

  private _clearCompleted() {
    return Effect.gen(this, function* () {
      const tasks = yield* this._getTasks("completed");
      let count = 0;
      for (const task of tasks) {
        yield* Effect.promise(() =>
          this.storage.delete(`task:${task.taskId}`)
        );
        count++;
      }
      if (count > 0) {
        yield* Effect.promise(() =>
          this.storage.transaction(async (txn: any) => {
            await this._rebuildQueueSync(txn);
            await this._updateAlarmSync(txn);
          })
        );
      }
      return count;
    });
  }

  /**
   * Delete all tasks regardless of status. Returns the count of deleted tasks.
   */
  clearAll(): Effect.Effect<number, never, never> {
    return this._clearAll();
  }

  private _clearAll() {
    return Effect.gen(this, function* () {
      const tasks = yield* this._getTasks();
      let count = 0;
      for (const task of tasks) {
        yield* Effect.promise(() =>
          this.storage.delete(`task:${task.taskId}`)
        );
        count++;
      }
      if (count > 0) {
        yield* Effect.promise(() =>
          this.storage.transaction(async (txn: any) => {
            await this._rebuildQueueSync(txn);
            await this._updateAlarmSync(txn);
          })
        );
      }
      return count;
    });
  }

  /**
   * Call this from your Durable Object's alarm handler to process scheduled tasks.
   */
  alarm(): Effect.Effect<void, never, never> {
    return this._alarm();
  }

  private _alarm() {
    return Effect.gen(this, function* () {
      const now = Date.now();
      const dueTaskIds = yield* this._getDueTaskIds(now);

      yield* Effect.logDebug(`[_alarm] Found ${dueTaskIds.length} due tasks at ${now}`);

      // Separate recovery tasks (stuck) from normal tasks
      const recoveryTasks: string[] = [];
      const normalTasks: string[] = [];

      for (const taskId of dueTaskIds) {
        const task = yield* Effect.promise(() => this.storage.get<Task>(`task:${taskId}`));
        if (task) {
          const scheduledAt = task.scheduledAt || 0;
          const isStuck = scheduledAt === 0 || (scheduledAt > 0 && now > scheduledAt + 5000);
          if (isStuck) {
            recoveryTasks.push(taskId);
            yield* Effect.logDebug(`[_alarm] Recovery task: ${taskId} (${task.taskName}), scheduled=${scheduledAt}, overdue=${scheduledAt > 0 ? Math.round((now - scheduledAt) / 1000) : 'never'}s`);
          } else {
            normalTasks.push(taskId);
            yield* Effect.logDebug(`[_alarm] Normal task: ${taskId} (${task.taskName}), scheduled=${scheduledAt}`);
          }
        } else {
          // If task not found, treat as normal (will be skipped in processTask)
          normalTasks.push(taskId);
        }
      }

      yield* Effect.logDebug(`[_alarm] Processing ${recoveryTasks.length} recovery tasks, ${normalTasks.length} normal tasks`);

      // Process recovery tasks first (they're more critical)
      yield* Effect.forEach(recoveryTasks, (taskId) => this._processTaskEffect(taskId), { concurrency: this.maxConcurrentTasks });

      // Then process normal tasks
      yield* Effect.forEach(normalTasks, (taskId) => this._processTaskEffect(taskId), { concurrency: this.maxConcurrentTasks });

      yield* Effect.promise(() =>
        this.storage.transaction(async (txn: any) => {
          await this._rebuildQueueSync(txn);
          await this._updateAlarmSync(txn);
        })
      );
    });
  }

  private _processTaskEffect(taskId: string): Effect.Effect<void, never, never> {
    return Effect.promise(() => this._processTaskAsync(taskId));
  }

  private async _processTaskAsync(taskId: string): Promise<void> {
    const startTime = Date.now();
    const task = await this.storage.get<Task>(`task:${taskId}`);
    if (!task) {
      await Effect.runPromise(Effect.log(`[processTask] Task ${taskId} not found, skipping`));
      return;
    }

    await Effect.runPromise(Effect.log(`[processTask] Processing task ${taskId} (${task.taskName}), status=${task.status}, scheduled=${task.scheduledAt}`));

    if (task.status === "paused") {
      await Effect.runPromise(Effect.log(`[processTask] Task ${taskId} is paused, skipping`));
      return;
    }

    if (task.progress.completed) {
      await Effect.runPromise(Effect.log(`[processTask] Task ${taskId} is completed, marking as completed`));
      await this._updateTaskSync(taskId, (t) => {
        t.status = "completed";
        return true;
      });
      return;
    }

    const handler = this.handlers.get(task.taskName);
    if (!handler) {
      await Effect.runPromise(Effect.logError(`[processTask] No handler for taskName "${task.taskName}"`));
      return;
    }

    await Effect.runPromise(Effect.log(`[processTask] Running handler for task ${taskId} (${task.taskName})`));

    // Mark task as running if not already
    const updated = await this._updateTaskSync(taskId, (t) => {
      if (t.status !== "running") {
        t.status = "running";
      }
      return true;
    });
    if (!updated) return;

    try {
      // Create service layer and provide it to the handler effect
      const layer = this._createServiceLayer();
      const maxRetries = task.maxRetries ?? 3;
      const schedule = Schedule.exponential(Duration.millis(100));
      const result = await Effect.runPromise(Effect.provide(Effect.retry(handler(taskId, task.params), schedule), layer) as Effect.Effect<void, unknown, never>);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await Effect.runPromise(Effect.logError(`Task ${taskId} (${task.taskName}) threw: ${errorMessage}`));
      await this._updateTaskSync(taskId, (t) => {
        t.status = "failed";
        t.progress.error = errorMessage;
        return true;
      });
    } finally {
      // Track execution time per task
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        await Effect.runPromise(Effect.logWarning(`[processTask] Task ${taskId} (${task.taskName}) took ${duration}ms`));
      }
    }
  }

  private _updateTask(
    taskId: string,
    mutate: (task: Task) => boolean
  ): Effect.Effect<boolean> {
    return Effect.promise(() =>
      this.storage.transaction(async (txn: any) => {
        const task = (await txn.get(`task:${taskId}`)) as Task | undefined;
        if (!task) return false;
        const changed = mutate(task);
        if (changed) {
          await txn.put(`task:${taskId}`, task);
        }
        return changed;
      })
    );
  }

  private async _updateTaskSync(
    taskId: string,
    mutate: (task: Task) => boolean
  ): Promise<boolean> {
    return await this.storage.transaction(async (txn: any) => {
      const task = (await txn.get(`task:${taskId}`)) as Task | undefined;
      if (!task) return false;
      const changed = mutate(task);
      if (changed) {
        await txn.put(`task:${taskId}`, task);
      }
      return changed;
    });
  }

  private async _rebuildQueueSync(txn: any): Promise<void> {
    const storage = txn || this.storage;

    // Use cached tasks if available and valid, otherwise load from storage
    if (!this.cacheValid || !this.taskCache) {
      const list = await storage.list({ prefix: "task:" });
      this.taskCache = new Map();
      for (const [key, value] of list) {
        const taskId = key.substring(5); // Remove "task:" prefix
        this.taskCache.set(taskId, value as Task);
      }
      this.cacheValid = true;
    }

    // Get task IDs from cache
    const taskIds = Array.from(this.taskCache.keys());

    const activeTaskIds: string[] = [];
    for (const id of taskIds) {
      const t = this.taskCache.get(id);
      if (
        t &&
        t.status !== "completed" &&
        t.status !== "failed" &&
        t.status !== "paused" &&
        !t.progress.completed &&
        (t.status === "pending" ||
          (t.status === "running" && (t.safetyAlarmAt || t.scheduledAt > 0)))
      ) {
        activeTaskIds.push(id);
      }
    }

    const tasksWithTime: Array<{ id: string; time: number; priority: number }> = [];
    for (const id of activeTaskIds) {
      const t = this.taskCache.get(id);
      if (t) {
        // Use scheduledAt for queue ordering (it's updated when rescheduling)
        // safetyAlarmAt is only for eviction recovery, not scheduling
        const time = t.scheduledAt;
        const priority = t.priority ?? 1;
        tasksWithTime.push({ id, time, priority });
      }
    }

    // Sort by scheduledAt first, then by priority (0=high first) for tasks due at same time
    const sorted = tasksWithTime
      .sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        return a.priority - b.priority;
      })
      .map((o) => o.id);
    await storage.put("queue", sorted);
  }

  private _rebuildQueue(txn?: any): Effect.Effect<void> {
    return Effect.promise(() => this._rebuildQueueSync(txn));
  }

  private _getQueue(): Effect.Effect<string[]> {
    return Effect.promise(() => this._getQueueSync(this.storage));
  }

  private _getDueTaskIds(now: number): Effect.Effect<string[], never, never> {
    return Effect.gen(this, function* () {
      const queue = yield* this._getQueue();
      const due: string[] = [];

      // Ensure cache is loaded
      if (!this.cacheValid || !this.taskCache) {
        const list = yield* Effect.promise(() =>
          this.storage.list({ prefix: "task:" })
        );
        this.taskCache = new Map();
        for (const [key, value] of list) {
          const taskId = key.substring(5); // Remove "task:" prefix
          this.taskCache.set(taskId, value as Task);
        }
        this.cacheValid = true;
      }

      for (const taskId of queue) {
        // Use cached task if available
        const task = this.taskCache.get(taskId);
        if (!task) continue;

        // Use scheduledAt for determining if task is due (it's updated when rescheduling)
        // safetyAlarmAt is only for eviction recovery, not scheduling
        const dueTime = task.scheduledAt;
        const isDue = dueTime <= now && !task.progress.completed;
        if (isDue) {
          due.push(taskId);
        } else {
          // Queue is sorted by scheduledAt, so if this one isn't due, none after are
          if (dueTime > now) {
            const waitTime = Math.round((dueTime - now) / 1000);
            if (due.length === 0 && waitTime < 60) {
              // Only log if no tasks are due and wait is short (to avoid spam)
              yield* Effect.logDebug(`[_getDueTaskIds] Next task ${taskId} due in ${waitTime}s (scheduled=${dueTime}, now=${now})`);
            }
          }
          break;
        }
      }

      if (due.length > 0) {
        yield* Effect.logDebug(`[_getDueTaskIds] Found ${due.length} due tasks: ${due.join(', ')}`);
      }
      return due;
    });
  }

  private async _updateAlarmSync(txn: any): Promise<void> {
    const storage = txn || this.storage;
    const queue = await this._getQueueSync(storage);
    if (queue.length === 0) {
      await storage.deleteAlarm();
      return;
    }

    const nextId = queue[0];
    if (!nextId) return;

    // Use cached task if available, otherwise read from storage
    let nextTask: Task | undefined;
    if (this.cacheValid && this.taskCache) {
      nextTask = this.taskCache.get(nextId);
    }
    if (!nextTask) {
      nextTask = (await storage.get(`task:${nextId}`)) as Task | undefined;
    }
    if (!nextTask) return;

    // Use scheduledAt for alarm timing (it's updated when rescheduling)
    // safetyAlarmAt is only for eviction recovery, not scheduling
    const nextTime = nextTask.scheduledAt;
    const now = Date.now();
    if (nextTime > now) {
      await storage.setAlarm(nextTime);
    } else {
      // Task is due NOW or overdue - set alarm for immediate execution
      await storage.setAlarm(now + 1);
    }
  }

  private async _getQueueSync(storage: DurableObjectStorage): Promise<string[]> {
    let queue = (await storage.get("queue")) as string[] | undefined;
    if (!queue || queue.length === 0) {
      await this._rebuildQueueSync(storage);
      queue = (await storage.get("queue")) as string[] | undefined;
    }
    return queue ?? [];
  }

  private _updateAlarm(txn?: any): Effect.Effect<void> {
    return Effect.promise(() => this._updateAlarmSync(txn));
  }

  /**
   * Invalidate the task cache. Call this after any task mutation.
   */
  private invalidateCache(): void {
    this.cacheValid = false;
    this.taskCache = null;
  }

  /**
   * Execute a multi-step task with automatic progress tracking, pause/resume support, checkpointing, and optional auto-completion.
   */
  runSteps(
    taskId: string,
    steps: string[],
    options: {
      stepDuration?: number;
      onStep?: (
        stepName: string,
        stepIndex: number
      ) => Promise<void> | Effect.Effect<void>;
      result?: string; // Optional result message
      autoComplete?: boolean; // Auto-complete task when done (default: true)
    } = {}
  ): Effect.Effect<void, never, never> {
    return this._runSteps(taskId, steps, options);
  }

  /**
   * Helper for sub-step execution within a step. Handles pause checks and progress tracking automatically.
   */
  runSubSteps(
    taskId: string,
    stepName: string,
    stepIndex: number,
    totalSteps: number,
    subStepCount: number,
    subStepDuration: number,
    onSubStep?: (subStepIndex: number) => Promise<void> | Effect.Effect<void>
  ): Effect.Effect<void, never, never> {
    return this._runSubSteps(
      taskId,
      stepName,
      stepIndex,
      totalSteps,
      subStepCount,
      subStepDuration,
      onSubStep
    );
  }

  private _runSubSteps(
    taskId: string,
    stepName: string,
    stepIndex: number,
    totalSteps: number,
    subStepCount: number,
    subStepDuration: number,
    onSubStep?: (subStepIndex: number) => Promise<void> | Effect.Effect<void>
  ) {
    return Effect.gen(this, function* () {
      for (let j = 0; j < subStepCount; j++) {
        // Automatic pause checking
        const task = yield* this._getTask(taskId);
        if (!task || task.status === "paused") {
          return;
        }

        // Execute sub-step callback or wait
        if (onSubStep) {
          const subStepResult = onSubStep(j);
          // Handle both Promise and Effect return types
          if (subStepResult && typeof (subStepResult as any).then === 'function') {
            // It's a Promise
            yield* Effect.promise(() => subStepResult as Promise<void>);
          } else {
            // It's an Effect
            yield* (subStepResult as Effect.Effect<void>);
          }
        } else {
          yield* Effect.sleep(Duration.millis(subStepDuration));
        }

        // Update sub-step progress if multiple sub-steps
        if (subStepCount > 1) {
          yield* this._checkpoint(
            taskId,
            "step",
            `${stepName} (${j + 1}/${subStepCount})`
          );
          yield* this._checkpoint(
            taskId,
            "progress",
            `${Math.round(
              ((stepIndex + (j + 1) / subStepCount) / totalSteps) * 100
            )}%`
          );
        }
      }
    });
  }

  /**
   * Generate a unique task ID. Default prefix is 'task'.
   */
  static generateTaskId(prefix: string = "task"): string {
    return `${prefix}-${Date.now()}`;
  }

  /**
   * Format a task object for UI consumption with standardized fields.
   */
  formatTaskForUI(task: Task): any {
    return {
      taskId: task.taskId,
      taskName: task.taskName,
      status: task.status,
      progress: task.progress,
      startedAt: task.startedAt ?? task.scheduledAt,
      completedAt: task.status === "completed" ? Date.now() : undefined,
      pausedAt: task.pausedAt,
      totalPausedMs: task.totalPausedMs ?? 0,
    };
  }

  private _runSteps(
    taskId: string,
    steps: string[],
    options: {
      stepDuration?: number;
      onStep?: (
        stepName: string,
        stepIndex: number
      ) => Promise<void> | Effect.Effect<void>;
      result?: string;
      autoComplete?: boolean;
    }
  ) {
    return Effect.gen(this, function* () {
      const totalSteps = steps.length;
      const stepDuration = options.stepDuration ?? 1000;

      // Get existing state
      let stepHistory: any[] =
        ((yield* this._getCheckpoint(taskId, "stepHistory")) as any[]) || [];
      const completedSteps =
        ((yield* this._getCheckpoint(taskId, "completedSteps")) as string[]) ||
        [];
      let currentStepIndex = completedSteps.length;

      // Process remaining steps
      while (currentStepIndex < totalSteps) {
        // Check if paused
        const task = yield* this._getTask(taskId);
        if (!task || task.status === "paused") {
          return;
        }

        const stepName = steps[currentStepIndex] || `step-${currentStepIndex + 1}`;
        const checkpointKey = `${stepName}_done`;

        // Check if step already completed
        const isDone = yield* this._getCheckpoint(taskId, checkpointKey);
        if (isDone) {
          currentStepIndex++;
          continue;
        }

        // Start step
        const stepStartTime = new Date().toISOString();
        stepHistory.push({
          step: stepName,
          index: currentStepIndex + 1,
          total: totalSteps,
          startedAt: stepStartTime,
          status: "running",
        });

        // Update progress checkpoints
        yield* this._checkpoint(taskId, "step", stepName);
        yield* this._checkpoint(taskId, "currentStepIndex", currentStepIndex);
        yield* this._checkpoint(taskId, "totalSteps", totalSteps);
        yield* this._checkpoint(
          taskId,
          "progress",
          `${Math.round((currentStepIndex / totalSteps) * 100)}%`
        );
        yield* this._checkpoint(taskId, "stepHistory", stepHistory);

        // Execute step callback or wait for duration
        if (options.onStep) {
          const stepResult = options.onStep(stepName, currentStepIndex);
          if (stepResult instanceof Promise) {
            yield* Effect.promise(() => stepResult);
          } else {
            yield* stepResult;
          }
        } else {
          yield* Effect.sleep(Duration.millis(stepDuration));
        }

        // Check if paused during step execution
        const taskAfterStep = yield* this._getTask(taskId);
        if (!taskAfterStep || taskAfterStep.status === "paused") {
          return;
        }

        // Mark step as complete
        yield* this._checkpoint(taskId, checkpointKey, true);
        completedSteps.push(stepName);
        currentStepIndex++;

        // Update step history
        const stepEntry = stepHistory[stepHistory.length - 1];
        if (stepEntry) {
          stepEntry.status = "completed";
          stepEntry.completedAt = new Date().toISOString();
        }

        // Update progress checkpoints
        yield* this._checkpoint(taskId, "currentStepIndex", currentStepIndex);
        yield* this._checkpoint(taskId, "completedSteps", completedSteps);
        yield* this._checkpoint(taskId, "stepHistory", stepHistory);
        yield* this._checkpoint(
          taskId,
          "progress",
          `${Math.round((currentStepIndex / totalSteps) * 100)}%`
        );
      }

      // All steps complete
      const finalTask = yield* this._getTask(taskId);
      if (!finalTask || finalTask.status === "paused") {
        return;
      }

      // Set final progress
      yield* this._checkpoint(taskId, "currentStepIndex", totalSteps);
      yield* this._checkpoint(taskId, "step", "done");
      yield* this._checkpoint(taskId, "progress", "100%");

      // Auto-complete if enabled (default: true)
      if (options.autoComplete !== false) {
        if (options.result) {
          yield* this._checkpoint(taskId, "result", options.result);
        }
        yield* this._completeTask(taskId);
      }
    });
  }
}

export type { Task, TaskHandler, TaskStatus };
