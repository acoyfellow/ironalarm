// ironalarm: Reliable task scheduling for Cloudflare Durable Objects
// Implements Kenton Varda's "reliable runNow" pattern for resilient long-running tasks

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

interface Task {
  taskId: string;
  taskName: string;          // e.g., "agent-loop", "daily-cleanup"
  params: any;               // Fully serializable parameters
  scheduledAt: number;       // ms timestamp
  status: TaskStatus;
  safetyAlarmAt?: number;    // for runNow reliability (30s safety net)
  progress: Record<string, any>;  // User-managed checkpoints
}

type TaskHandler = (scheduler: ReliableScheduler, taskId: string, params: any) => Promise<void>;

export class ReliableScheduler {
  private storage: DurableObjectStorage;
  private handlers: Map<string, TaskHandler> = new Map();

  constructor(storage: DurableObjectStorage) {
    this.storage = storage;
  }

  /** Register a named task handler (call in DO constructor) */
  register(taskName: string, handler: TaskHandler): void {
    this.handlers.set(taskName, handler);
  }

  /** Schedule a task for a future time */
  async schedule(at: Date | number, taskId: string, taskName: string, params: any = {}): Promise<void> {
    if (!this.handlers.has(taskName)) {
      throw new Error(`No handler registered for task "${taskName}"`);
    }

    const scheduledAt = typeof at === 'number' ? at : at.getTime();

    const task: Task = {
      taskId,
      taskName,
      params,
      scheduledAt,
      status: 'pending',
      progress: {},
    };

    await this.storage.transaction(async (txn: any) => {
      await txn.put(`task:${taskId}`, task);
      await this.rebuildQueue(txn);
      await this.updateAlarm(txn);
    });

    // If already due, process immediately in current context
    if (scheduledAt <= Date.now()) {
      await this.processTask(taskId);
    }
  }

  /** Run a task immediately with eviction safety */
  async runNow(taskId: string, taskName: string, params: any = {}): Promise<void> {
    if (!this.handlers.has(taskName)) {
      throw new Error(`No handler registered for task "${taskName}"`);
    }

    const safetyDelay = 30000; // 30 seconds
    const safetyAt = Date.now() + safetyDelay;

    const task: Task = {
      taskId,
      taskName,
      params,
      scheduledAt: Date.now(),
      status: 'running',
      safetyAlarmAt: safetyAt,
      progress: {},
    };

    await this.storage.transaction(async (txn: any) => {
      await txn.put(`task:${taskId}`, task);
      await this.rebuildQueue(txn);
      await txn.setAlarm(safetyAt);
    });

    // Start execution immediately (fire-and-forget; use ctx.waitUntil in fetch if needed)
    void this.processTask(taskId);
  }

  /** Checkpoint progress for resumability */
  async checkpoint(taskId: string, key: string, value: any): Promise<void> {
    await this.updateTask(taskId, (task) => {
      if (task.status !== 'running') return false; // no change
      task.progress[key] = value;
      return true;
    });
  }

  /** Get a checkpoint value */
  async getCheckpoint(taskId: string, key: string): Promise<any> {
    const task = await this.storage.get<Task>(`task:${taskId}`);
    return task?.progress[key];
  }

  /** Mark task as completed (call at end of handler) */
  async completeTask(taskId: string): Promise<void> {
    await this.updateTask(taskId, (task) => {
      task.status = 'completed';
      task.progress.completed = true;
      return true;
    });
  }

  /** Main alarm handler – call from your DO's alarm() */
  async alarm(): Promise<void> {
    const now = Date.now();
    const dueTaskIds = await this.getDueTaskIds(now);

    for (const taskId of dueTaskIds) {
      void this.processTask(taskId); // fire-and-forget each
    }

    await this.storage.transaction(async (txn: any) => {
      await this.rebuildQueue(txn);
      await this.updateAlarm(txn);
    });
  }

  // Internal: process a single task
  private async processTask(taskId: string): Promise<void> {
    const task = await this.storage.get<Task>(`task:${taskId}`);
    if (!task) return;

    // Skip if already completed via checkpoint
    if (task.progress.completed) {
      await this.updateTask(taskId, (t) => {
        t.status = 'completed';
        return true;
      });
      return;
    }

    const handler = this.handlers.get(task.taskName);
    if (!handler) {
      console.error(`No handler for taskName "${task.taskName}"`);
      return;
    }

    // Ensure status is running
    let updated = false;
    if (task.status !== 'running') {
      updated = await this.updateTask(taskId, (t) => {
        t.status = 'running';
        return true;
      });
      if (!updated) return; // race/lost
    }

    try {
      await handler(this, taskId, task.params);
      // Handler should call completeTask() at the end
    } catch (err) {
      console.error(`Task ${taskId} (${task.taskName}) threw:`, err);
      // Optional: retry logic here
    }
  }

  // Internal: atomic task update
  private async updateTask(taskId: string, mutate: (task: Task) => boolean): Promise<boolean> {
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

  // Internal: rebuild sorted queue (taskIds only)
  private async rebuildQueue(txn?: any): Promise<void> {
    const storage = txn || this.storage;
    const list = (await storage.list({ prefix: 'task:' })) as any;
    const taskIds = Array.from((list.keys() as any) as string[]).map((k: string) => k.substring(5)); // strip "task:"

    const activeTaskIds: string[] = [];
    for (const id of taskIds) {
      const t = (await storage.get(`task:${id}`)) as Task | undefined;
      if (t && (t.status === 'pending' || (t.status === 'running' && t.safetyAlarmAt && !t.progress.completed))) {
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

    const sorted = tasksWithTime.sort((a, b) => a.time - b.time).map(o => o.id);
    await storage.put('queue', sorted);
  }

  // Internal: get current queue
  private async getQueue(): Promise<string[]> {
    let queue = (await this.storage.get('queue')) as string[] | undefined;
    if (!queue || queue.length === 0) {
      await this.rebuildQueue();
      queue = (await this.storage.get('queue')) as string[] | undefined;
    }
    return queue ?? [];
  }

  // Internal: get taskIds that are due now
  private async getDueTaskIds(now: number): Promise<string[]> {
    const queue = await this.getQueue();
    const due: string[] = [];

    for (const taskId of queue) {
      const task = (await this.storage.get(`task:${taskId}`)) as Task | undefined;
      if (!task) continue;

      const dueTime = task.safetyAlarmAt ?? task.scheduledAt;
      if (dueTime <= now && !task.progress.completed) {
        due.push(taskId);
      } else {
        break; // queue is sorted
      }
    }
    return due;
  }

  // Internal: set/clear single real alarm
  private async updateAlarm(txn?: any): Promise<void> {
    const storage = txn || this.storage;
    const queue = await this.getQueue();
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
}

// Export types for users
export type { Task, TaskHandler, TaskStatus };
