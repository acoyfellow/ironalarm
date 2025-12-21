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

      const now = Date.now();
      const task: Task = {
        taskId,
        taskName,
        params,
        scheduledAt,
        startedAt: now,
        status: "pending",
        progress: {},
      };

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
        // Allow checkpoints on running, completed, or failed tasks
        // Failed tasks can be checkpointed to allow recovery (especially for global-state)
        if (task.status !== "running" && task.status !== "completed" && task.status !== "failed") {
          console.error(`[checkpoint] Task ${taskId} status is ${task.status}, cannot checkpoint`);
          return false;
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
      if (!updated) {
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
      yield* this._updateTask(taskId, (task) => {
        task.status = "completed";
        task.progress.completed = true;
        return true;
      });
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

  private _getTasks(status?: TaskStatus) {
    return Effect.gen(this, function* () {
      const list = yield* Effect.promise(() =>
        this.storage.list({ prefix: "task:" })
      );
      const tasks: Task[] = [];
      for (const [, value] of list) {
        const task = value as Task;
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
    const list = await storage.list({ prefix: "task:" });
    const taskIds = Array.from((list.keys() as any) as string[]).map(
      (k: string) => k.substring(5)
    );

    const activeTaskIds: string[] = [];
    for (const id of taskIds) {
      const t = (await storage.get(`task:${id}`)) as Task | undefined;
      if (
        t &&
        t.status !== "completed" &&
        t.status !== "failed" &&
        t.status !== "paused" &&
        (t.status === "pending" ||
          (t.status === "running" &&
            t.safetyAlarmAt &&
            !t.progress.completed))
      ) {
        activeTaskIds.push(id);
      }
    }

    const tasksWithTime: Array<{ id: string; time: number }> = [];
    for (const id of activeTaskIds) {
      const t = (await storage.get(`task:${id}`)) as Task | undefined;
      if (t) {
        const time = t.safetyAlarmAt ?? t.scheduledAt;
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

      for (const taskId of queue) {
        const taskResult = yield* Effect.promise(() =>
          this.storage.get<Task>(`task:${taskId}`)
        );
        const task = taskResult as Task | undefined;
        if (!task) continue;

        const dueTime = task.safetyAlarmAt ?? task.scheduledAt;
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
    const nextTask = (await storage.get(`task:${nextId}`)) as Task | undefined;
    if (!nextTask) return;

    const nextTime = nextTask.safetyAlarmAt ?? nextTask.scheduledAt;
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
