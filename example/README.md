# ironalarm Example

Interactive demo and example implementation of `ironalarm` - reliable task scheduling for Cloudflare Durable Objects.

This example demonstrates:
- Task scheduling with `ReliableScheduler`
- Real-time task updates via WebSockets
- Interactive demos (standard and "Mission Control" game UI)
- API documentation generation

## Quick Start

```bash
# 1. Set your Alchemy password
echo 'ALCHEMY_PASSWORD=your-secure-password' > .env

# 2. Start development (migrations run automatically)
bun run dev
```

## What's Included

- **ironalarm** - Reliable task scheduling library demo
- **SvelteKit** with Svelte 5 and remote functions
- **Better Auth** with email/password authentication
- **Cloudflare D1** database (SQLite) for user data
- **Durable Objects** for persistent edge state and task execution
- **Alchemy** for zero-config deployment
- **WebSocket** real-time synchronization across browser tabs

## Project Structure

```
src/
├── lib/
│   ├── auth.ts              # Better Auth configuration
│   ├── auth-client.ts       # Auth client setup
│   ├── auth-store.svelte.ts # Auth state management
│   └── schema.ts            # Database schema
├── routes/
│   ├── api/auth/[...all]/   # Better Auth API routes
│   ├── data.remote.ts       # Your remote functions go here
│   └── +page.svelte         # Main page with auth demo
└── hooks.server.ts          # Server hooks for auth

worker/
└── index.ts                 # TaskSchedulerDO using ReliableScheduler

alchemy.run.ts               # Deployment configuration
```

## Development Workflow

### 1. Understanding the Task Scheduler

The `worker/index.ts` file contains `TaskSchedulerDO`, a Durable Object that uses `ReliableScheduler` from the `ironalarm` library:

```typescript
import { ReliableScheduler } from "../../src/index";

export class TaskSchedulerDO extends DurableObject {
  private scheduler: ReliableScheduler;
  
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.scheduler = new ReliableScheduler(ctx.storage);
    // Register task handlers...
  }
}
```

### 2. Explore the Demos

- **Homepage** (`/`) - Interactive demo with step visualization
- **Mission Control** (`/mission`) - Game-style UI with real-time WebSocket sync
- **API Docs** (`/docs/api`) - Auto-generated API documentation

### 3. Task Operations

The example uses remote functions in `src/routes/data.remote.ts` to interact with the scheduler:

```typescript
export const startTask = command('unchecked', async (params: any) => {
  return callWorkerJSON(platform, '/task/start', {
    method: 'POST',
    body: JSON.stringify(params)
  });
});

export const getTasks = query('unchecked', async () => {
  return callWorkerJSON(platform, '/tasks');
});
```

These functions call the Durable Object's HTTP API, which uses `ReliableScheduler` internally.

## Environment Variables

Required:
- `ALCHEMY_PASSWORD` - Your Alchemy deployment password
- `BETTER_AUTH_SECRET` - Auto-generated secure secret for auth

Optional:
- `BETTER_AUTH_URL` - Your app URL (defaults to localhost:5173)

## Scripts

- `bun run dev` - Start development server (runs migrations automatically)
- `bun run build` - Build for production
- `bun run deploy` - Deploy to Cloudflare
- `bun run db:studio` - Open Drizzle Studio (for local development)

## Deployment

```bash
# Deploy to Cloudflare
bun run deploy

# Destroy infrastructure
bun run destroy
```

Alchemy handles:
- D1 database creation and migrations
- Durable Object namespace setup
- Worker deployment with bindings
- SvelteKit app deployment
- Service binding configuration

## Learn More

- See the main [ironalarm README](../README.md) for library documentation
- Check out `worker/index.ts` to see how `ReliableScheduler` is used
- Explore the interactive demos to understand task lifecycle and real-time updates

## Architecture

```
SvelteKit Component → Remote Function → Cloudflare Worker → TaskSchedulerDO (Durable Object)
                                                              ↓
                                                      ReliableScheduler
                                                              ↓
                                                      DurableObjectStorage
```

**Real-time Updates**: WebSocket connections broadcast task state changes to all connected clients, enabling synchronized views across browser tabs.

**Task Lifecycle**: Tasks are scheduled with `runNow()` or `schedule()`, execute with automatic retry on eviction, and can be paused/resumed with full state preservation.

## Resources

- [SvelteKit Docs](https://kit.svelte.dev/)
- [Better Auth Docs](https://www.better-auth.com/)
- [Durable Objects Docs](https://developers.cloudflare.com/durable-objects/)
- [Alchemy Docs](https://alchemy.run/)
