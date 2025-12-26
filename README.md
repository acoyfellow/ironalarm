# ironalarm

[![npm version](https://img.shields.io/npm/v/ironalarm.svg)](https://www.npmjs.com/package/ironalarm)

Reliable task scheduling for Cloudflare Durable Objects, implementing the "reliable runNow" pattern for resilient long-running tasks.

## Problem

Cloudflare Durable Objects can evict your code after ~144 seconds of inactivity. For long-running operations (like AI agent loops), a single eviction mid-task breaks your workflow. `ironalarm` solves this with a lightweight, userspace implementation that persists task state and uses a 30-second safety alarm net—if evicted, the task automatically retries and resumes from checkpoints.

## Features

- **Reliable execution**: `runNow()` starts immediately + 30s safety alarm for eviction recovery
- **Future scheduling**: `schedule()` for delayed/recurring tasks
- **Checkpoints**: User-managed progress tracking for resumable work
- **Named handlers**: Register task handlers by name (no function serialization)
- **Fully serializable**: Tasks are just `{ taskName, params, progress }`

## Installation

```bash
bun install ironalarm
# or
bun add ironalarm
```

## Quick Start

```typescript
import { ReliableScheduler } from 'ironalarm';
import { Effect } from 'effect';

export class MyDO {
  private scheduler: ReliableScheduler;

  constructor(state: DurableObjectState, env: any) {
    this.scheduler = new ReliableScheduler(state.storage);

    this.scheduler.register('my-task', (sched, taskId, params) => {
      return Effect.gen(function* () {
        const started = yield* Effect.promise(() => sched.getCheckpoint(taskId, 'started'));
        if (!started) {
          yield* Effect.promise(() => doWork(params));
          yield* Effect.promise(() => sched.checkpoint(taskId, 'started', true));
        }
        yield* Effect.promise(() => expensiveOperation());
        yield* Effect.promise(() => sched.completeTask(taskId));
      });
    });
  }

  async alarm() {
    await this.scheduler.alarm();
  }

  async startTask(params: any) {
    const taskId = crypto.randomUUID();
    await this.scheduler.runNow(taskId, 'my-task', params);
  }
}
```

## Infinite Loop Tasks

For tasks that run forever (like game loops, background processors), use `maxRetries: Infinity`:

```typescript
// Register an infinite loop handler that reschedules itself
this.scheduler.register('mining-loop', (sched, taskId, params) => {
  return Effect.gen(function* () {
    // Check if cancelled/paused
    const task = yield* Effect.promise(() => sched.getTask(taskId));
    if (!task || task.status === 'paused' || task.status === 'failed') return false;

    // Do work
    yield* Effect.promise(() => mineResources(params));

    // Reschedule for next cycle (critical for loops!)
    const nextTime = Date.now() + 5000;
    yield* Effect.promise(() => sched.schedule(nextTime, taskId, 'mining-loop', params));
    return true; // Indicates we should continue
  });
});

// Start with infinite retries so it survives DO restarts
await this.scheduler.runNow(taskId, 'mining-loop', params, { maxRetries: Infinity });
```

**Critical: Hibernation Recovery**

Durable Objects hibernate after ~30 seconds of inactivity. When a DO hibernates for hours/days:
- Tasks with `scheduledAt` times in the past become "stuck"
- The alarm processes them, but they may not reschedule correctly
- **You MUST check and recover stuck tasks on every DO wake-up**

**Required Pattern**: Add recovery checks in your `fetch()` and `alarm()` methods:

```typescript
export class MyDO extends DurableObject {
  private scheduler: ReliableScheduler;

  constructor(ctx: any, env: any) {
    super(ctx, env);
    this.scheduler = new ReliableScheduler(this.ctx.storage);
    // ... register handlers ...
    
    // Resume tasks after DO restart
    this.resumeRunningTasks();
  }

  private async resumeRunningTasks() {
    const LOOP_TASKS = ['mining-loop', 'game-state'];
    const tasks = await this.scheduler.getTasks();
    const now = Date.now();
    
    for (const task of tasks) {
      if (LOOP_TASKS.includes(task.taskName) && 
          (task.status === 'running' || task.status === 'failed' || task.status === 'completed')) {
        
        // Recover failed/completed tasks
        if (task.status === 'failed' || task.status === 'completed') {
          await this.scheduler.checkpoint(task.taskId, '_recovered', true);
        }
        
        // If scheduled time is way in the past, reschedule immediately
        if (task.scheduledAt > 0 && now > task.scheduledAt + 60000) {
          const params = task.params;
          await this.scheduler.schedule(now + 100, task.taskId, task.taskName, params);
          continue;
        }
        
        // Otherwise resume normally
        const handler = this.scheduler.getHandler(task.taskName);
        if (handler) {
          Effect.runPromise(handler(this.scheduler, task.taskId, task.params));
        }
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    // CRITICAL: Check for stuck tasks on every wake-up
    await this.recoverStuckTasks();
    return this.app.fetch(request);
  }

  async alarm() {
    await this.scheduler.alarm();
    // CRITICAL: Check again after alarm processing
    await this.recoverStuckTasks();
  }

  private async recoverStuckTasks() {
    const LOOP_TASKS = ['mining-loop', 'game-state'];
    const tasks = await this.scheduler.getTasks();
    const now = Date.now();
    
    for (const task of tasks) {
      if (!LOOP_TASKS.includes(task.taskName)) continue;
      
      // Recover failed/completed
      if (task.status === 'failed' || task.status === 'completed') {
        await this.scheduler.checkpoint(task.taskId, '_recovered', true);
      }
      
      // Reschedule if stuck (scheduled >1min ago)
      if (task.status === 'running' && task.scheduledAt > 0 && now > task.scheduledAt + 60000) {
        const params = task.params;
        await this.scheduler.schedule(now + 100, task.taskId, task.taskName, params);
      }
    }
  }
}
```

**Why This Matters**: Without recovery checks, tasks scheduled for "5 seconds from now" will be stuck if the DO hibernates for hours. The alarm processes overdue tasks, but they may not reschedule correctly. Recovery checks ensure they resume properly.

## API

### Constructor
`new ReliableScheduler(storage: DurableObjectStorage)`

### Methods

- `register(taskName, handler)` — Register a named task handler
- `runNow(taskId, taskName, params?, options?)` — Start immediately with eviction safety
  - `options.maxRetries` — Override retry limit (default: 3, use `Infinity` for loop tasks)
- `schedule(at, taskId, taskName, params?)` — Schedule for future time
- `checkpoint(taskId, key, value)` — Save progress
- `getCheckpoint(taskId, key)` — Retrieve progress
- `completeTask(taskId)` — Mark as done
- `getTask(taskId)` — Get single task by ID
- `getTasks(status?)` — List all tasks (optionally filter by status)
- `cancelTask(taskId)` — Cancel/delete a task
- `pauseTask(taskId)` — Pause a task (removes from queue)
- `resumeTask(taskId)` — Resume a paused task (re-adds to queue)
- `clearCompleted()` — Delete all completed tasks, returns count
- `clearAll()` — Delete all tasks, returns count
- `getHandler(taskName)` — Get registered handler by name (for manual re-execution)
- `alarm()` — Call from DO's alarm handler
- `recoverStuckTasks(taskNames?)` — Recover overdue tasks after hibernation (call in `fetch()` and `alarm()`)

## Design

- **Eviction safety**: 30s safety alarm retries if evicted
- **Checkpoints**: Skip already-done work on resume
- **Named handlers**: No function serialization
- **Single queue**: One alarm drives all tasks
- **Retry limits**: Tasks automatically fail after 3 retries (configurable via `maxRetries`)
- **Pause/resume**: Tasks can be paused and resumed without losing state

## License

MIT
