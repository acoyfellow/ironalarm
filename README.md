# ironalarm

[![npm version](https://img.shields.io/npm/v/ironalarm.svg)](https://www.npmjs.com/package/ironalarm)

Reliable task scheduling for Cloudflare Durable Objects, implementing the "reliable runNow" pattern with Effect-TS for resilient long-running tasks.

## Breaking Changes (v0.2.0)

**⚠️ All public APIs now return `Effect<T, E, never>` instead of `Promise<T>`**

```typescript
// Before (v0.1.0)
await scheduler.runNow(taskId, 'my-task', params);

// After (v0.2.0)
await Effect.runPromise(scheduler.runNow(taskId, 'my-task', params));

// Or in Effect context:
const program = Effect.gen(function* () {
  yield* scheduler.runNow(taskId, 'my-task', params);
});
await Effect.runPromise(program);
```

**Task Handler Signature Change:**
```typescript
// Before
type TaskHandler = (scheduler: ReliableScheduler, taskId: string, params: unknown) => Effect.Effect<void>;

// After
type TaskHandler = (taskId: string, params: unknown) => Effect.Effect<void, unknown, typeof SchedulerService>;
```

## Problem

Cloudflare Durable Objects can evict your code after ~144 seconds of inactivity. For long-running operations (like AI agent loops), a single eviction mid-task breaks your workflow. `ironalarm` solves this with a lightweight, checkpointed implementation powered by Effect-TS that persists task state and uses a 30-second safety alarm net—if evicted, the task automatically retries and resumes from checkpoints.

## Features

- **Effect-TS powered**: Public APIs return `Effect<T, E, never>`, handlers use `Effect<T, E, SchedulerService>` for DI
- **Dependency injection**: `SchedulerService` Context.Tag enables testable services
- **Reliable execution**: `runNow()` starts immediately + 30s safety alarm for eviction recovery
- **Future scheduling**: `schedule()` for delayed/recurring tasks
- **Priority queues**: High/medium/low priority for execution order when multiple tasks are due
- **Checkpoints**: User-managed progress tracking for resumable work
- **Named handlers**: Register task handlers by name (no function serialization)
- **Fully serializable**: Tasks are just `{ taskName, params, progress, priority }`

## Installation

```bash
bun install ironalarm
# or
bun add ironalarm
```

## Quick Start

```typescript
import { ReliableScheduler, SchedulerService } from 'ironalarm';
import { Effect } from 'effect';

export class MyDO {
  private scheduler: ReliableScheduler;

  constructor(state: DurableObjectState, env: any) {
    this.scheduler = new ReliableScheduler(state.storage);

    // TaskHandler signature: (taskId, params) => Effect.Effect<void, never, SchedulerService>
    this.scheduler.register('my-task', (taskId, params) => {
      return Effect.gen(function* () {
        const svc = yield* SchedulerService;
        const started = yield* svc.getCheckpoint(taskId, 'started');
        if (!started) {
          yield* Effect.promise(() => doWork(params));
          yield* svc.checkpoint(taskId, 'started', true);
        }
        yield* Effect.promise(() => expensiveOperation());
        yield* svc.completeTask(taskId);
      });
    });
  }

  async alarm() {
    await Effect.runPromise(this.scheduler.alarm());
  }

  async startTask(params: any) {
    const taskId = crypto.randomUUID();
    await Effect.runPromise(this.scheduler.runNow(taskId, 'my-task', params));
  }
}
```

## Effect Context Usage

For larger workflows, use `Effect.gen` to compose operations:

```typescript
export class MyDO {
  private scheduler: ReliableScheduler;

  constructor(state: DurableObjectState, env: any) {
    this.scheduler = new ReliableScheduler(state.storage);
    this.scheduler.register('complex-task', (taskId, params) => {
      return Effect.gen(function* () {
        const svc = yield* SchedulerService;

        // Check existing state
        const started = yield* svc.getCheckpoint(taskId, 'started');
        if (!started) {
          yield* svc.checkpoint(taskId, 'started', true);
          yield* Effect.log('Task initialized');
        }

        // Do work
        yield* Effect.promise(() => processItem(params));

        // Update progress
        yield* svc.checkpoint(taskId, 'progress', { items: 1 });

        // Complete
        yield* svc.completeTask(taskId);
        yield* Effect.log('Task completed');
      });
    });
  }

  async handleRequest(taskId: string, params: any) {
    // Provide scheduler context to Effect
    await Effect.runPromise(
      this.scheduler.runNow(taskId, 'complex-task', params)
    );
  }
}
```

## Infinite Loop Tasks

For tasks that run forever (like game loops, background processors), use `maxRetries: Infinity`:

```typescript
// Register an infinite loop handler that reschedules itself
this.scheduler.register('mining-loop', (taskId, params) => {
  return Effect.gen(function* () {
    const svc = yield* SchedulerService;

    // Check if cancelled/paused
    const task = yield* svc.getTask(taskId);
    if (!task || task.status === 'paused' || task.status === 'failed') return false;

    // Do work
    yield* Effect.promise(() => mineResources(params));

    // Reschedule for next cycle (critical for loops!)
    const nextTime = Date.now() + 5000;
    yield* svc.schedule(nextTime, taskId, 'mining-loop', params);
    return true; // Indicates we should continue
  });
});

// Start with infinite retries so it survives DO restarts
await Effect.runPromise(
  this.scheduler.runNow(taskId, 'mining-loop', params, { maxRetries: Infinity })
);
```

**Critical: Hibernation Recovery**

Durable Objects hibernate after ~30 seconds of inactivity. When a DO hibernates for hours/days:
- Tasks with `scheduledAt` times in past become "stuck"
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
    const tasks = await Effect.runPromise(this.scheduler.getTasks());
    const now = Date.now();

    for (const task of tasks) {
      if (LOOP_TASKS.includes(task.taskName) &&
          (task.status === 'running' || task.status === 'failed' || task.status === 'completed')) {

        // Recover failed/completed tasks
        if (task.status === 'failed' || task.status === 'completed') {
          await Effect.runPromise(this.scheduler.checkpoint(task.taskId, '_recovered', true));
        }

        // If scheduled time is way in past (or never scheduled), reschedule immediately
        const scheduledAt = task.scheduledAt || 0;
        if (scheduledAt === 0 || (scheduledAt > 0 && now > scheduledAt + 5000)) {
          const params = task.params;
          await Effect.runPromise(this.scheduler.schedule(now + 100, task.taskId, task.taskName, params));
          continue;
        }

        // Otherwise resume normally
        const handler = this.scheduler.getHandler(task.taskName);
        if (handler) {
          await Effect.runPromise(handler(task.taskId, task.params));
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
    await Effect.runPromise(this.scheduler.alarm());
    // CRITICAL: Check again after alarm processing
    await this.recoverStuckTasks();
  }

  private async recoverStuckTasks() {
    const LOOP_TASKS = ['mining-loop', 'game-state'];
    const tasks = await Effect.runPromise(this.scheduler.getTasks());
    const now = Date.now();

    for (const task of tasks) {
      if (!LOOP_TASKS.includes(task.taskName)) continue;

      // Recover failed/completed
      if (task.status === 'failed' || task.status === 'completed') {
        await Effect.runPromise(this.scheduler.checkpoint(task.taskId, '_recovered', true));
      }

      // Reschedule if stuck (scheduled >5 seconds ago OR never scheduled)
      const scheduledAt = task.scheduledAt || 0;
      if ((task.status === 'running' || task.status === 'pending') &&
          (scheduledAt === 0 || (scheduledAt > 0 && now > scheduledAt + 5000))) {
        const params = task.params;
        await Effect.runPromise(this.scheduler.schedule(now + 100, task.taskId, task.taskName, params));
      }
    }
  }
}
```

**Why This Matters**: Without recovery checks, tasks scheduled for "5 seconds from now" will be stuck if the DO hibernates for hours. The alarm processes overdue tasks, but they may not reschedule correctly. Recovery checks ensure they resume properly.

**Recovery Threshold**: The `recoverStuckTasks()` method uses a 5-second threshold (not 60 seconds) to catch stuck tasks quickly. It also handles:
- Tasks with `scheduledAt === 0` (never scheduled)
- Tasks in "pending" status that should be running
- Tasks that are overdue by more than 5 seconds

**Troubleshooting Stuck Tasks**: If tasks stop counting after hibernation:
1. Check logs for `[recoverStuckTasks]` messages - these show what's being recovered
2. Check logs for `[fetch]` and `[alarm]` messages - these show task states on wake-up
3. Verify `recoverStuckTasks()` is being called in both `fetch()` and `alarm()` methods
4. Ensure tasks are rescheduling themselves correctly in their handlers

**CPU Limit Management**: Durable Objects get their CPU time limit "topped up" on each request (including `fetch()` and `alarm()` calls). However, if many tasks recover simultaneously, they can exhaust CPU before completing. The scheduler includes:
- **Concurrency limits**: Processes tasks in batches (default: 10 concurrent) to prevent CPU exhaustion
- **Task prioritization**: Recovery tasks (stuck >5s) process before normally scheduled tasks
- **Execution time monitoring**: Logs warnings if alarm processing takes >5s, errors if >10s
- **Per-task timing**: Logs warnings for individual tasks taking >1s

To adjust concurrency for high-throughput scenarios:
```typescript
const scheduler = new ReliableScheduler(storage, { maxConcurrentTasks: 20 });
```

## API

### Constructor
```typescript
new ReliableScheduler(storage: DurableObjectStorage, options?)
```
- `storage` - Durable Object storage instance
- `options.maxConcurrentTasks` - Maximum number of tasks to process concurrently (default: 10)

### Task Handlers

```typescript
type TaskHandler = (taskId: string, params: unknown) => Effect.Effect<void, never, SchedulerService>;

scheduler.register(taskName: string, handler: TaskHandler): void
```

Handlers receive `SchedulerService` from Effect context:
```typescript
scheduler.register('my-task', (taskId, params) => {
  return Effect.gen(function* () {
    const svc = yield* SchedulerService;
    yield* svc.checkpoint(taskId, 'progress', { step: 1 });
    // ... do work ...
    yield* svc.completeTask(taskId);
  });
});
```

### Public Methods

All methods return `Effect<T, E, SchedulerService>`. Wrap with `Effect.runPromise()` for async use:

#### Core Operations

```typescript
// Start task immediately (returns Effect<void, HandlerMissing, SchedulerService>)
scheduler.runNow(taskId, taskName, params?, options?)
  .pipe(Effect.runPromise)

// Schedule for future time (returns Effect<void, HandlerMissing, SchedulerService>)
scheduler.schedule(at: Date | number, taskId, taskName, params?, options?)
  .pipe(Effect.runPromise)
```

Options:
- `options.maxRetries` — Override retry limit (default: 3, use `Infinity` for loop tasks)
- `options.priority` — Task priority: 0=high, 1=medium, 2=low (default: 1)

#### Checkpoints

```typescript
// Save progress (returns Effect<void, never, SchedulerService>)
scheduler.checkpoint(taskId, key, value)
  .pipe(Effect.runPromise)

// Retrieve progress (returns Effect<unknown, never, SchedulerService>)
scheduler.getCheckpoint(taskId, key)
  .pipe(Effect.runPromise)

// Batch save (returns Effect<void, never, SchedulerService>)
scheduler.checkpointMultiple(taskId, updates: Record<string, unknown>)
  .pipe(Effect.runPromise)
```

#### Task Management

```typescript
// Mark complete (returns Effect<void, never, SchedulerService>)
scheduler.completeTask(taskId)
  .pipe(Effect.runPromise)

// Get single task (returns Effect<Task | undefined, never, SchedulerService>)
scheduler.getTask(taskId)
  .pipe(Effect.runPromise)

// List tasks (returns Effect<Task[], never, SchedulerService>)
scheduler.getTasks(status?: TaskStatus)
  .pipe(Effect.runPromise)

// Cancel task (returns Effect<boolean, never, SchedulerService>)
scheduler.cancelTask(taskId)
  .pipe(Effect.runPromise)

// Pause task (returns Effect<boolean, never, SchedulerService>)
scheduler.pauseTask(taskId)
  .pipe(Effect.runPromise)

// Resume task (returns Effect<boolean, never, SchedulerService>)
scheduler.resumeTask(taskId)
  .pipe(Effect.runPromise)

// Delete completed (returns Effect<number, never, SchedulerService>)
scheduler.clearCompleted()
  .pipe(Effect.runPromise)

// Delete all (returns Effect<number, never, SchedulerService>)
scheduler.clearAll()
  .pipe(Effect.runPromise)
```

#### System Operations

```typescript
// Process due tasks (call from DO alarm)
scheduler.alarm()
  .pipe(Effect.runPromise)

// Recover stuck tasks after hibernation
scheduler.recoverStuckTasks(taskNames?: string[])
  .pipe(Effect.runPromise)

// Get registered handler
scheduler.getHandler(taskName): TaskHandler | undefined
```

## Error Types

All errors are tagged and raised in the error channel:

```typescript
class HandlerMissing extends Data.TaggedError("HandlerMissing")<{
  taskName: string
}> {}

class TaskNotFound extends Data.TaggedError("TaskNotFound")<{
  taskId: string
}> {}

class TaskConflict extends Data.TaggedError("TaskConflict")<{
  taskId: string
  currentStatus: string
  operation: string
}> {}
```

Example error handling:
```typescript
const result = await Effect.runPromise(
  Effect.either(scheduler.runNow(taskId, 'my-task', params))
);

if (result._tag === 'Left') {
  const error = result.left;
  if (error._tag === 'HandlerMissing') {
    console.error('No handler for task:', error.taskName);
  }
}
```

## Priority Scheduling

When multiple tasks are due at the same time, priority determines execution order:

```typescript
// High priority - executes first (0 = highest)
await Effect.runPromise(
  scheduler.runNow('urgent-task', 'process', data, { priority: 0 })
);

// Medium priority - default behavior
await Effect.runPromise(
  scheduler.runNow('normal-task', 'process', data)
);

// Low priority - executes last
await Effect.runPromise(
  scheduler.runNow('background-task', 'cleanup', {}, { priority: 2 })
);

// Also works with schedule()
await Effect.runPromise(
  scheduler.schedule(Date.now() + 5000, 'task-id', 'handler', params, { priority: 0 })
);
```

**Behavior:**
- Tasks due at same time → higher priority (lower number) runs first
- Different `scheduledAt` → earlier time runs first (priority is secondary sort)
- Default priority = 1 (medium)
- Backward compatible (existing tasks default to priority 1)

## Design

- **Effect-TS powered**: Composable, testable APIs with dependency injection
- **Eviction safety**: 30s safety alarm retries if evicted
- **Checkpoints**: Skip already-done work on resume
- **Named handlers**: No function serialization required
- **Single queue**: One alarm drives all tasks, sorted by time then priority
- **Retry limits**: Tasks automatically fail after 3 retries (configurable via `maxRetries`)
- **Pause/resume**: Tasks can be paused and resumed without losing state
- **Structured errors**: All failures in explicit error channel (no swallowed exceptions)

## Production Deployment

### Durable Object Sharding Strategy

For high-throughput applications, distribute tasks across multiple DO instances using consistent hashing:

```typescript
// Sharding by user ID - ensures user tasks stay in same DO
function getShardId(userId: string, totalShards: number): string {
  const hash = crypto.createHash('md5').update(userId).digest('hex');
  const shardNum = parseInt(hash.slice(0, 8), 16) % totalShards;
  return `scheduler-shard-${shardNum}`;
}

// In your Worker
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const shardId = getShardId(userId, 10); // 10 shards

    const id = env.TASK_SCHEDULER_DO.idFromName(shardId);
    const stub = env.TASK_SCHEDULER_DO.get(id);

    return stub.fetch(request);
  }
};
```

**Scaling Guidelines:**
- **1-10 DOs**: Low traffic applications
- **10-100 DOs**: Medium traffic (thousands of concurrent users)
- **100+ DOs**: High traffic (millions of users)
- Monitor CPU usage per DO - shard when approaching 10s alarm processing time

### Effect.runPromise Requirement

**Critical**: All public API calls must be wrapped with `Effect.runPromise()`:

```typescript
// ✅ CORRECT: Wrap all scheduler calls
await Effect.runPromise(scheduler.runNow(taskId, 'my-task', params));
await Effect.runPromise(scheduler.schedule(time, taskId, 'my-task', params));
await Effect.runPromise(scheduler.getTasks());

// ❌ WRONG: Direct calls return Effect<T>, not Promise<T>
const result = scheduler.runNow(taskId, 'my-task', params); // Effect<T>
await result; // TypeError: Effect is not a Promise
```

**Why this matters:**
- ironalarm APIs return `Effect<T, E, R>` for composability
- Cloudflare Workers expect `Promise<T>` from fetch handlers
- Effect.runPromise() executes the Effect and returns a Promise

### Common Pitfalls

#### 1. Handler Signature Mismatch

```typescript
// ❌ WRONG: Old v0.1.0 signature
this.scheduler.register('my-task', (scheduler, taskId, params) => {
  return Effect.gen(function* () {
    // scheduler is passed as first param
    yield* scheduler.checkpoint(taskId, 'key', 'value');
  });
});

// ✅ CORRECT: New v0.2.0 signature
this.scheduler.register('my-task', (taskId, params) => {
  return Effect.gen(function* () {
    const svc = yield* SchedulerService; // Get from context
    yield* svc.checkpoint(taskId, 'key', 'value');
  });
});
```

**Migration**: Remove `scheduler` parameter, use `yield* SchedulerService` instead.

#### 2. Missing Effect.runPromise in DO Methods

```typescript
// ❌ WRONG: DO methods must return Promise<T>
async startTask(params: any) {
  return this.scheduler.runNow(taskId, 'my-task', params); // Returns Effect<T>
}

// ✅ CORRECT: Wrap with Effect.runPromise
async startTask(params: any) {
  return Effect.runPromise(this.scheduler.runNow(taskId, 'my-task', params));
}
```

#### 3. Infinite Loop Tasks Without maxRetries: Infinity

```typescript
// ❌ WRONG: Default 3 retries causes loops to fail after eviction
await Effect.runPromise(
  scheduler.runNow(taskId, 'mining-loop', params)
);

// ✅ CORRECT: Explicit infinite retries for loops
await Effect.runPromise(
  scheduler.runNow(taskId, 'mining-loop', params, { maxRetries: Infinity })
);
```

#### 4. Missing Hibernation Recovery

```typescript
// ❌ WRONG: Tasks get stuck after DO hibernation
async fetch(request: Request): Promise<Response> {
  return this.app.fetch(request); // No recovery check
}

// ✅ CORRECT: Always check for stuck tasks
async fetch(request: Request): Promise<Response> {
  await this.recoverStuckTasks(); // Critical!
  return this.app.fetch(request);
}
```

#### 5. Task ID Validation Bypass

```typescript
// ❌ WRONG: Allows path traversal attacks
await Effect.runPromise(
  scheduler.runNow("../etc/passwd", "handler", params)
);

// ✅ CORRECT: Validation happens automatically
// TaskLimitExceeded thrown for invalid identifiers
```

#### 6. Storage Exhaustion Without Limits

```typescript
// ❌ WRONG: Unbounded task creation
const scheduler = new ReliableScheduler(storage); // Default 10000 limit

// ✅ CORRECT: Configure limits for your use case
const scheduler = new ReliableScheduler(storage, {
  maxTotalTasks: 50000, // Adjust based on storage capacity
  maxConcurrentTasks: 50 // Adjust based on CPU limits
});
```

#### 7. Missing Error Handling

```typescript
// ❌ WRONG: Unhandled Effect errors crash the DO
await Effect.runPromise(scheduler.runNow(taskId, 'missing-handler', params));

// ✅ CORRECT: Handle errors explicitly
const result = await Effect.runPromise(
  Effect.either(scheduler.runNow(taskId, 'missing-handler', params))
);

if (result._tag === 'Left') {
  // Handle HandlerMissing, ValidationError, TaskLimitExceeded, etc.
}
```

### Monitoring and Debugging

**Key Metrics to Monitor:**
- DO CPU time per alarm cycle (>10s = too many tasks)
- Task queue length (spikes indicate backlogs)
- Recovery frequency (high = hibernation issues)
- Error rates by type (ValidationError = bad inputs)

**Debug Commands:**
```bash
# Check task states
curl "https://your-worker.dev/tasks"

# Force alarm processing
curl "https://your-worker.dev/_alarm" -X POST

# Check DO logs for recovery messages
# Look for: [recoverStuckTasks], [fetch] DO woke up, [alarm] Recovered
```

## License

MIT

## Logging

By default, the scheduler and example worker only emit **warnings and errors** to reduce Cloudflare Observability costs.

### Configure log level

Set `IRONALARM_LOG_LEVEL` in your worker environment to one of:

- `debug`
- `info`
- `warn` (default)
- `error`
- `none`

Example (Alchemy):

```ts
export const WORKER = await Worker(`${projectName}-worker`, {
  name: `${projectName}-worker`,
  entrypoint: "./worker/index.ts",
  bindings: {
    TASK_SCHEDULER_DO,
  },
  env: {
    IRONALARM_LOG_LEVEL: "error",
  },
  adopt: true,
  url: false,
});
```

Example (Scheduler):

```ts
const scheduler = new ReliableScheduler(storage, {
  maxConcurrentTasks: 10,
  logLevel: "warn",
});
```
