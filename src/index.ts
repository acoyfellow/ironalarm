// ironalarm: Effect-powered Reliable task scheduling for Cloudflare Durable Objects
// Implements Kenton Varda's "reliable runNow" pattern with Effect-TS internals

import { Effect, Data } from "effect";

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
  retryCount?: number;
  maxRetries?: number;
  pausedAt?: number;
  totalPausedMs?: number;
}

type TaskHandler = (
  scheduler: ReliableScheduler,
  taskId: string,
  params: unknown
) => Effect.Effect<void>;


class HandlerMissing extends Data.TaggedError("HandlerMissing")<{
  taskName: string;
}> { }

export class ReliableScheduler {
  private storage: DurableObjectStorage;
  private handlers: Map<string, TaskHandler> = new Map();
  private taskCache: Map<string, Task> | null = null;
  private cacheValid = false;

  /**
   * Creates a new scheduler instance with the provided Durable Object storage.
   */
  constructor(storage: DurableObjectStorage) {
    this.storage = storage;
  }

  /**
   * Register a named task handler. The handler receives the scheduler, taskId, and params.
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
   */
  async schedule(
    at: Date | number,
    taskId: string,
    taskName: string,
    params: unknown = {}
  ): Promise<void> {
    return Effect.runPromise(this._schedule(at, taskId, taskName, params));
  }

  private _schedule(
    at: Date | number,
    taskId: string,
    taskName: string,
    params: unknown
  ) {
    return Effect.gen(this, function* () {
      if (!this.handlers.has(taskName)) {
        yield* new HandlerMissing({ taskName });
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
        yield* Effect.promise(() => this.processTask(taskId));
      }
    });
  }

  /**
   * Start a task immediately with eviction safety. Sets a 30s safety alarm for automatic retry.
   * @param options.maxRetries - Override default retry count (default: 3, use Infinity for infinite loop tasks)
   */
  async runNow(
    taskId: string,
    taskName: string,
    params: unknown = {},
    options?: { maxRetries?: number }
  ): Promise<void> {
    return Effect.runPromise(this._runNow(taskId, taskName, params, options));
  }

  private _runNow(taskId: string, taskName: string, params: unknown, options?: { maxRetries?: number }) {
    return Effect.gen(this, function* () {
      if (!this.handlers.has(taskName)) {
        yield* new HandlerMissing({ taskName });
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

      void this.processTask(taskId);
    });
  }

  /**
   * Save progress for a task. Use this to mark completion of expensive operations.
   */
  async checkpoint(
    taskId: string,
    key: string,
    value: unknown
  ): Promise<void> {
    return Effect.runPromise(this._checkpoint(taskId, key, value));
  }

  private _checkpoint(taskId: string, key: string, value: unknown) {
    return Effect.gen(this, function* () {
      const updated = yield* this._updateTask(taskId, (task) => {
        // Allow checkpoints on pending (for initialization), running, completed, or failed tasks
        // Failed tasks can be checkpointed to allow recovery (especially for global-state)
        // Pending tasks can be checkpointed for initialization (e.g., global-state setup)
        if (task.status !== "pending" && task.status !== "running" && task.status !== "completed" && task.status !== "failed") {
          console.error(`[checkpoint] Task ${taskId} status is ${task.status}, cannot checkpoint`);
          return false;
        }
        // If task is pending, mark it as running (initialization checkpoint)
        if (task.status === "pending") {
          task.status = "running";
        }
        // If task is failed, mark it as running again to allow recovery
        if (task.status === "failed") {
          task.status = "running";
          task.retryCount = 0; // Reset retry count on recovery
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
        console.error(`[checkpoint] Failed to update checkpoint ${key} for task ${taskId}`);
      }
    });
  }

  /**
   * Retrieve saved progress for a task. Returns undefined if not found.
   */
  async getCheckpoint(taskId: string, key: string): Promise<unknown> {
    return Effect.runPromise(this._getCheckpoint(taskId, key));
  }

  /**
   * Batch multiple checkpoint updates into a single write operation.
   * Accepts an object of key-value pairs to update.
   */
  async checkpointMultiple(taskId: string, updates: Record<string, unknown>): Promise<void> {
    return Effect.runPromise(this._checkpointMultiple(taskId, updates));
  }

  private _checkpointMultiple(taskId: string, updates: Record<string, unknown>) {
    return Effect.gen(this, function* () {
      const updated = yield* this._updateTask(taskId, (task) => {
        // Allow checkpoints on pending (for initialization), running, completed, or failed tasks
        if (task.status !== "pending" && task.status !== "running" && task.status !== "completed" && task.status !== "failed") {
          console.error(`[checkpointMultiple] Task ${taskId} status is ${task.status}, cannot checkpoint`);
          return false;
        }
        // If task is pending, mark it as running (initialization checkpoint)
        if (task.status === "pending") {
          task.status = "running";
        }
        // If task is failed, mark it as running again to allow recovery
        if (task.status === "failed") {
          task.status = "running";
          task.retryCount = 0;
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
        console.error(`[checkpointMultiple] Failed to update checkpoints for task ${taskId}`);
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
  async completeTask(taskId: string): Promise<void> {
    return Effect.runPromise(this._completeTask(taskId));
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
  async getTask(taskId: string): Promise<Task | undefined> {
    return Effect.runPromise(this._getTask(taskId));
  }

  private _getTask(taskId: string) {
    return Effect.promise(() => this.storage.get<Task>(`task:${taskId}`));
  }

  /**
   * Get all tasks, optionally filtered by status.
   */
  async getTasks(status?: TaskStatus): Promise<Task[]> {
    return Effect.runPromise(this._getTasks(status));
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

  /**
   * Cancel and delete a task. Returns true if successful, false if task not found.
   */
  async cancelTask(taskId: string): Promise<boolean> {
    return Effect.runPromise(this._cancelTask(taskId));
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
  async pauseTask(taskId: string): Promise<boolean> {
    return Effect.runPromise(this._pauseTask(taskId));
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
  async resumeTask(taskId: string): Promise<boolean> {
    return Effect.runPromise(this._resumeTask(taskId));
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
        void this.processTask(taskId);
      }

      return updated;
    });
  }

  /**
   * Delete all completed tasks. Returns the count of deleted tasks.
   */
  async clearCompleted(): Promise<number> {
    return Effect.runPromise(this._clearCompleted());
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
  async clearAll(): Promise<number> {
    return Effect.runPromise(this._clearAll());
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
  async alarm(): Promise<void> {
    return Effect.runPromise(this._alarm());
  }

  private _alarm() {
    return Effect.gen(this, function* () {
      const now = Date.now();
      const dueTaskIds = yield* this._getDueTaskIds(now);

      for (const taskId of dueTaskIds) {
        void this.processTask(taskId);
      }

      yield* Effect.promise(() =>
        this.storage.transaction(async (txn: any) => {
          await this._rebuildQueueSync(txn);
          await this._updateAlarmSync(txn);
        })
      );
    });
  }

  private async processTask(taskId: string): Promise<void> {
    const task = await this.storage.get<Task>(`task:${taskId}`);
    if (!task) return;

    if (task.status === "paused") return;

    if (task.progress.completed) {
      await this._updateTaskSync(taskId, (t) => {
        t.status = "completed";
        return true;
      });
      return;
    }

    const handler = this.handlers.get(task.taskName);
    if (!handler) {
      console.error(`No handler for taskName "${task.taskName}"`);
      return;
    }

    const isRetry =
      task.safetyAlarmAt && task.status === "running";
    const maxRetries = task.maxRetries ?? 3;
    const retryCount = task.retryCount ?? 0;

    if (isRetry && retryCount >= maxRetries) {
      const errorMessage = `Task exceeded max retries (${maxRetries})`;
      await this._updateTaskSync(taskId, (t) => {
        t.status = "failed";
        t.progress.error = errorMessage;
        return true;
      });
      console.error(
        `Task ${taskId} (${task.taskName}) exceeded max retries (${maxRetries})`
      );
      return;
    }

    let updated = false;
    if (task.status !== "running") {
      updated = await this._updateTaskSync(taskId, (t) => {
        t.status = "running";
        return true;
      });
      if (!updated) return;
    } else if (isRetry) {
      updated = await this._updateTaskSync(taskId, (t) => {
        t.retryCount = (t.retryCount ?? 0) + 1;
        return true;
      });
      if (!updated) return;
    }

    try {
      await Effect.runPromise(handler(this, taskId, task.params));
    } catch (err) {
      console.error(`Task ${taskId} (${task.taskName}) threw:`, err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      await this._updateTaskSync(taskId, (t) => {
        if (t.status === "running") {
          t.progress.lastError = errorMessage;
        }
        return true;
      });
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

    const tasksWithTime: Array<{ id: string; time: number }> = [];
    for (const id of activeTaskIds) {
      const t = this.taskCache.get(id);
      if (t) {
        // Use scheduledAt for queue ordering (it's updated when rescheduling)
        // safetyAlarmAt is only for eviction recovery, not scheduling
        const time = t.scheduledAt;
        tasksWithTime.push({ id, time });
      }
    }

    const sorted = tasksWithTime
      .sort((a, b) => a.time - b.time)
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
        if (dueTime <= now && !task.progress.completed) {
          due.push(taskId);
        } else {
          break;
        }
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
    if (nextTime > Date.now()) {
      await storage.setAlarm(nextTime);
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
  async runSteps(
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
  ): Promise<void> {
    return Effect.runPromise(this._runSteps(taskId, steps, options));
  }

  /**
   * Helper for sub-step execution within a step. Handles pause checks and progress tracking automatically.
   */
  async runSubSteps(
    taskId: string,
    stepName: string,
    stepIndex: number,
    totalSteps: number,
    subStepCount: number,
    subStepDuration: number,
    onSubStep?: (subStepIndex: number) => Promise<void> | Effect.Effect<void>
  ): Promise<void> {
    return Effect.runPromise(
      this._runSubSteps(
        taskId,
        stepName,
        stepIndex,
        totalSteps,
        subStepCount,
        subStepDuration,
        onSubStep
      )
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
          if (subStepResult instanceof Promise) {
            yield* Effect.promise(() => subStepResult);
          } else {
            yield* subStepResult;
          }
        } else {
          yield* Effect.promise(
            () => new Promise<void>((r) => setTimeout(r, subStepDuration))
          );
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
          yield* Effect.promise(
            () => new Promise<void>((r) => setTimeout(r, stepDuration))
          );
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
