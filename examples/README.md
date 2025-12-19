# ironalarm Example

Interactive demo of the `ironalarm` library using Cloudflare Workers and Durable Objects.

## What This Does

- Serves an interactive web UI at `localhost:8787`
- Demonstrates long-running task execution with **checkpoints** for resumability
- Shows the "reliable runNow" pattern protecting against eviction

The example simulates an agent that researches a topic → analyzes findings → writes a report, with each phase tracked as a checkpoint.

## Setup

Install dependencies (this links to the local ironalarm library):

```bash
cd examples
bun install
```

## Run

```bash
bun run wrangler dev
```

Then open **http://localhost:8787** in your browser.

## How It Works

1. **Enter a topic** (e.g., "AI agents") and select a duration (1s to 1 year)
2. **Click "Start Agent"** to launch a task
3. **Watch the task progress** in real-time:
   - `researching` → `analyzing` → `synthesizing` → `writing` → `finalizing` → `completed`
4. **Inspect the progress object** to see checkpoints being saved
5. **Simulate eviction** by restarting the worker during a task—it will resume from its last checkpoint!

## Project Structure

```
examples/
├── src/
│   ├── index.ts           # Main Worker (serves UI + routes requests)
│   └── agent.ts           # AgentDO (uses ReliableScheduler)
├── package.json           # Dependencies
├── wrangler.json          # Cloudflare Workers config
└── tsconfig.json          # TypeScript config
```

## API Endpoints

- `POST /task/start` — Start a new task
  ```json
  {
    "taskName": "agent-loop",
    "topic": "AI agents"
  }
  ```

- `GET /tasks` — Get all task statuses

- `GET /task/status?taskId=task-123` — Get single task status

## Key Features Demonstrated

- **runNow()** — Starts immediately with 30s safety alarm
- **Checkpoints** — Progress persists across evictions
- **Named handlers** — Register tasks by name
- **Fully serializable** — No function serialization
- **Real-time UI** — Polls task status every 500ms

## Next Steps

- Modify `src/agent.ts` to add your own task types
- Extend the UI to trigger different tasks
- Experiment with longer-running operations to see the safety alarm in action

## Tips

- Task duration is configurable from 1 second to 1 year
- Wrangler emulates Durable Objects locally—no real eviction occurs
- Check the console logs to see task progress and checkpoints
- Try different durations to see how checkpoints work at various scales

## Learn More

- [ironalarm README](../README.md)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Durable Objects Docs](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/)
