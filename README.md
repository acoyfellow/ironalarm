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
- **Minimal**: ~300 LOC, zero dependencies

## Installation

```bash
npm install ironalarm
# or
bun add ironalarm
```

## Quick Start

```typescript
import { ReliableScheduler } from 'ironalarm';

export class MyDO {
  private scheduler: ReliableScheduler;

  constructor(state: DurableObjectState, env: any) {
    this.scheduler = new ReliableScheduler(state.storage);

    this.scheduler.register('my-task', async (sched, taskId, params) => {
      if (!await sched.getCheckpoint(taskId, 'started')) {
        await doWork(params);
        await sched.checkpoint(taskId, 'started', true);
      }
      await expensiveOperation();
      await sched.completeTask(taskId);
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

## API

### Constructor
`new ReliableScheduler(storage: DurableObjectStorage)`

### Methods

- `register(taskName, handler)` — Register a named task handler
- `runNow(taskId, taskName, params?)` — Start immediately with eviction safety
- `schedule(at, taskId, taskName, params?)` — Schedule for future time
- `checkpoint(taskId, key, value)` — Save progress
- `getCheckpoint(taskId, key)` — Retrieve progress
- `completeTask(taskId)` — Mark as done
- `alarm()` — Call from DO's alarm handler

## Design

- **Eviction safety**: 30s safety alarm retries if evicted
- **Checkpoints**: Skip already-done work on resume
- **Named handlers**: No function serialization
- **Single queue**: One alarm drives all tasks

## License

MIT
