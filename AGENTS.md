# AGENTs.md (Ralph)

This repo is run in a Ralph-style loop:
**pick ONE story → implement → verify → commit → record learnings → repeat**.

This file is the source-of-truth for:
- local dev workflow
- testing with Cloudflare Workers (Miniflare/Vitest)
- Effect-TS refactor progress tracking
- known footguns (Durable Objects, Effect context, test isolation)

---

## NORTH STAR / STOP CONDITION

Stop only when **ALL** are true:

1) **A production-ready npm library exists**
   - `package.json` is correct (name, versioning, exports)
   - `README.md` has working examples matching actual API
   - `bun run build` produces publishable artifacts (`dist/`)
   - `npm pack` succeeds and produces the expected tarball contents
   - Version matches between `package.json` and `README.md` breaking changes

2) **Fully testable with passing suite**
   - `bun run test` runs locally and passes (Vitest + @cloudflare/vitest-pool-workers)
   - All Effect-TS refactor stories (001-007) are completed and verified
   - Tests exercise real Durable Objects storage (not mocks-only)
   - Tests are runnable by a new machine with documented prerequisites

3) **Effect-TS patterns are correct**
   - All public APIs return `Effect<T, E, SchedulerService>` (not `Promise<T>`)
   - Task handlers use `SchedulerService` from Context (not injected scheduler)
   - No `Promise.all`, `try/catch`, or `setTimeout` in implementation
   - Error channel is explicit (all failures in `E`, not swallowed)
   - Structured logging via `Effect.log*` (not `console.*`)

If any of the above is not true, keep iterating.

---

## ABSOLUTE RULES (non-negotiable)

1) **Do only PRD work**
- If it isn't in `scripts/ralph/prd.json`, don't do it.
- Check story status in `scripts/ralph/progress.txt` before starting.

2) **One story per iteration**
- Implement exactly one story per iteration (the highest priority pending story).
- Stories 001-003 are marked "completed" in prd.json but code doesn't match - verify actual state first.

3) **Tests first, then implement**
- Write tests BEFORE implementing (per PRD rules).
- Test file location: `test/[story-name].test.ts` (see prd.json for exact filename).
- All tests must pass before moving to next story.

4) **Verify before commit**
- Run `bun run typecheck` - must pass with no errors.
- Run `bun run test` - all tests must pass.
- If either fails → `git checkout` to revert, fix, retry.
- If both pass → commit.

5) **Commit only green**
Commit message format:
- `feat: [ID] - [Title]` (new functionality)
- `fix: [ID] - [Title]` (bug fixes)
- `chore: [ID] - [Title]` (maintenance)

Example: `feat: 004 - Convert public APIs from Promise<T> to Effect<T, E, R>`

6) **Memory is files**
Persistent memory is ONLY:
- git commits
- `scripts/ralph/prd.json` (task truth - update story status after completion)
- `scripts/ralph/progress.txt` (patterns + learnings - update after each story)
- `CHANGELOG.md` (decisions + version notes + breaking changes)

7) **Effect-First Principles**
- Effect-TS solves whole classes of issues out of the box. Use it.
- **ALWAYS use Effect for:** concurrency (`Effect.all`, `Effect.forEach`), error handling (`Data.TaggedError`), retries (`Effect.retry` with `Schedule`), logging (`Effect.log*`), delays (`Effect.sleep`).
- **NEVER use:** `Promise.all`, `try/catch`, `setTimeout`, `console.log/error`.
- Effect source reference: `node_modules/effect` (or check Effect docs).
- If you're writing async code, use Effect. If you're not using Effect, you're probably doing it wrong.

8) **Status tracking**
- After completing a story, update `scripts/ralph/prd.json` to mark story as "completed".
- Update `scripts/ralph/progress.txt` with learnings/patterns discovered.
- If story status in prd.json doesn't match code reality, fix the status first.

---

## LOCAL DEV: REQUIRED SETUP

### Prerequisites
```bash
# Install dependencies
bun install

# Verify setup
bun run typecheck  # Should pass
bun run test       # Should pass (may have failures if refactor incomplete)
```

### Development Workflow

**Single story iteration:**
```bash
# 1. Pick next story from scripts/ralph/prd.json (status: "pending")
# 2. Write test first (test/[story-name].test.ts)
# 3. Implement (src/index.ts)
# 4. Verify
bun run typecheck
bun run test

# 5. If green, commit
git add .
git commit -m "feat: [ID] - [Title]"

# 6. Update tracking
# - Mark story as "completed" in scripts/ralph/prd.json
# - Add learnings to scripts/ralph/progress.txt
```

**Run specific test file:**
```bash
bun test test/core.test.ts
```

**Watch mode (for TDD):**
```bash
bun test --watch
```

---

## EFFECT-FIRST PRINCIPLES (detailed)

**Effect-TS solves whole classes of issues out of the box. Use it.**

### When to Use Effect

**ALWAYS use Effect for:**
- **Concurrency** - `Effect.all` or `Effect.forEach` for parallel operations (task processing, batch operations)
- **Error handling** - Typed errors with `Data.TaggedError`, no try/catch
- **Retries** - `Effect.retry` with `Schedule.exponential` for task retry logic
- **Logging** - `Effect.log`, `Effect.logError`, `Effect.logDebug` for structured logging
- **Delays** - `Effect.sleep` for delays, not `setTimeout`
- **Context/DI** - `Context.Tag` for dependency injection (SchedulerService)

**NEVER use:**
- Raw `Promise.all` - use `Effect.all` or `Effect.forEach` instead
- `try/catch` blocks - use `Effect.catchAll` or typed errors in error channel
- `setTimeout` - use `Effect.sleep`
- `console.log/error` - use `Effect.log*` functions
- Manual retry loops - use `Effect.retry` with `Schedule`

### Effect Patterns for ironalarm

1. **Task Processing with Concurrency**
   ```typescript
   // ✅ DO: Effect.forEach with concurrency limit
   yield* Effect.forEach(
     taskIds,
     (taskId) => processTask(taskId),
     { concurrency: this.maxConcurrentTasks }
   );
   
   // ❌ DON'T: Promise.all
   await Promise.all(
     taskIds.map(taskId => processTask(taskId))
   );
   ```

2. **Error Handling**
   ```typescript
   // ✅ DO: Typed errors with Data.TaggedError
   export class HandlerMissing extends Data.TaggedError("HandlerMissing")<{
     taskName: string;
   }> {}
   
   // Raise in Effect context
   yield* new HandlerMissing({ taskName });
   
   // ❌ DON'T: throw Error
   throw new Error(`No handler for ${taskName}`);
   ```

3. **Retry Logic**
   ```typescript
   // ✅ DO: Effect.retry with Schedule
   yield* Effect.retry(
     executeTask(taskId),
     Schedule.exponential("100ms").pipe(
       Schedule.compose(Schedule.recurs(3))
     )
   );
   
   // ❌ DON'T: Manual retryCount loops
   let retries = 0;
   while (retries < 3) {
     try {
       await executeTask(taskId);
       break;
     } catch (e) {
       retries++;
     }
   }
   ```

4. **Dependency Injection**
   ```typescript
   // ✅ DO: Context.Tag for services
   class SchedulerService extends Context.Tag("SchedulerService")<SchedulerService, {
     checkpoint: (taskId: string, key: string, value: unknown) => Effect.Effect<void>;
     // ...
   }> {}
   
   // Use in handlers
   const svc = yield* SchedulerService;
   yield* svc.checkpoint(taskId, "step", "done");
   
   // ❌ DON'T: Inject concrete scheduler
   type TaskHandler = (scheduler: ReliableScheduler, ...) => Effect.Effect<void>;
   ```

5. **Logging**
   ```typescript
   // ✅ DO: Effect.log* for structured logging
   yield* Effect.log(`Processing task ${taskId}`);
   yield* Effect.logError(`Task failed: ${error}`);
   
   // ❌ DON'T: console.log/error
   console.log(`Processing task ${taskId}`);
   console.error(`Task failed: ${error}`);
   ```

6. **Delays**
   ```typescript
   // ✅ DO: Effect.sleep
   yield* Effect.sleep("1s");
   
   // ❌ DON'T: setTimeout
   await new Promise(r => setTimeout(r, 1000));
   ```

### Why Effect Matters

Effect-TS provides:
- **Type-safe concurrency** - No race conditions, guaranteed resource cleanup
- **Composable errors** - Errors are values, not exceptions
- **Deterministic execution** - Effects are descriptions, not side effects
- **Resource safety** - Automatic cleanup, no leaks
- **Testability** - Effects can be tested without mocks
- **Dependency injection** - Context.Tag enables testable services

**If you're writing async code, use Effect. If you're not using Effect, you're probably doing it wrong.**

---

## TESTING WITH CLOUDFLARE WORKERS

### Test Setup
- Uses `@cloudflare/vitest-pool-workers` for Durable Objects testing
- Each test gets isolated DO instances via `env.SCHEDULER_DO.idFromName()`
- Tests run in Miniflare (local Workers runtime)

### Test Patterns

**Getting a fresh scheduler:**
```typescript
const getScheduler = () => {
  const id = env.SCHEDULER_DO.idFromName(`test-${Date.now()}-${Math.random()}`);
  return env.SCHEDULER_DO.get(id);
};
```

**Running in DO context:**
```typescript
await runInDurableObject(stub, async (instance) => {
  // instance is the ReliableScheduler DO instance
  await Effect.runPromise(instance.scheduler.runNow(...));
});
```

### Known Issues

1. **Story status mismatch**: Stories 001-003 marked "completed" in prd.json but code doesn't match. Verify actual state before proceeding.
2. **Effect context in tests**: Tests may need to provide `SchedulerService` Layer when testing handlers that use Context.
3. **DO isolation**: Each test should use unique DO IDs to avoid state leakage.

---

## CURRENT REFACTOR STATUS

**Stories 001-003**: Marked "completed" in prd.json but code doesn't match:
- TaskHandler still receives `(scheduler: ReliableScheduler, ...)` instead of using `SchedulerService` from Context
- SchedulerService is defined but not actually provided/implemented
- Public APIs return `Effect<..., SchedulerService>` but service isn't provided

**Next steps:**
1. Verify actual state of stories 001-003
2. Fix any incomplete work
3. Continue with story 004 (Convert APIs to Effect types)

---

## VERIFICATION CHECKLIST (per story)

Before committing:
- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes (all tests)
- [ ] Story acceptance criteria met (check prd.json)
- [ ] Test file exists and passes (see prd.json for filename)
- [ ] No `Promise.all`, `try/catch`, `setTimeout`, or `console.*` in new code
- [ ] Story status updated in `scripts/ralph/prd.json`
- [ ] Learnings recorded in `scripts/ralph/progress.txt`

---

## FOOTGUNS / GOTCHAS

1. **Durable Objects storage**: Transactions are async but Effect context needs proper handling
2. **Effect context propagation**: Handlers need `SchedulerService` in context - provide via Layer in tests
3. **Task state mutations**: Always use transactions for atomic updates
4. **Cache invalidation**: Invalidate task cache after any mutation
5. **Alarm scheduling**: Must rebuild queue and update alarm atomically in transaction
6. **Story status tracking**: prd.json and progress.txt can get out of sync - verify before starting work

---

## BREAKING CHANGES (0.1.0 → 0.2.0)

All public APIs now return `Effect<T, E, SchedulerService>` instead of `Promise<T>`:

```typescript
// Before (v0.1.0)
await scheduler.runNow(taskId, 'my-task', params);
await scheduler.schedule(at, taskId, 'my-task', params);

// After (v0.2.0)
await Effect.runPromise(scheduler.runNow(taskId, 'my-task', params));
await Effect.runPromise(scheduler.schedule(at, taskId, 'my-task', params));

// Or in Effect context:
const program = Effect.gen(function* () {
  yield* scheduler.runNow(taskId, 'my-task', params);
});
await Effect.runPromise(program);
```

TaskHandler signature changed:
```typescript
// Before
type TaskHandler = (scheduler: ReliableScheduler, taskId: string, params: unknown) => Effect.Effect<void>;

// After
type TaskHandler = (taskId: string, params: unknown) => Effect.Effect<void, never, SchedulerService>;
```

