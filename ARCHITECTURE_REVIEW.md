# Mission Architecture Review: Scalability & Design Issues

## Critical Scalability Issues

### 1. **Single DO Bottleneck** 🔴 CRITICAL
**Location:** `example/worker/index.ts:872, 879, 886`

**Problem:**
- All tasks route to ONE DO instance: `idFromName("scheduler")`
- With 1000 miners = 1000 tasks in one DO
- Queue rebuilds become O(n) where n = total tasks
- All clients connect to same DO WebSocket

**Break Point:** ~500-1000 concurrent miners will cause:
- Queue rebuild latency spikes
- WebSocket broadcast storms
- DO CPU timeouts
- Single point of failure

**Fix:**
```typescript
// Shard by namespace or user
const id = env.TASK_SCHEDULER_DO.idFromName(`scheduler-${namespace}`);
// Or hash-based sharding
const id = env.TASK_SCHEDULER_DO.idFromName(`scheduler-${hash(taskId) % 10}`);
```

### 2. **Broadcast Storm** 🔴 CRITICAL
**Location:** `example/worker/index.ts:357, 370` (every mining cycle)

**Problem:**
- Each miner broadcasts **twice per cycle** (after deposit + after checkpoint)
- 100 miners × 2 broadcasts/cycle × 1 cycle/4s = **50 broadcasts/second**
- Each broadcast sends ALL tasks to ALL connected clients
- With 1000 tasks, that's 50KB × 50 = **2.5MB/second** per client

**Break Point:** ~50 miners will flood WebSocket connections

**Fix:**
```typescript
// Debounce broadcasts (max once per 100ms)
private broadcastQueue: NodeJS.Timeout | null = null;
async triggerBroadcast() {
  if (this.broadcastQueue) return; // Already queued
  this.broadcastQueue = setTimeout(() => {
    const tasks = await this.scheduler.getCachedTasks();
    this.broadcast({ type: "tasks", data: tasks.map(...) });
    this.broadcastQueue = null;
  }, 100);
}

// Or: Only broadcast changed tasks, not all tasks
```

### 3. **setTimeout Defeats Hibernation** 🔴 CRITICAL
**Location:** `example/worker/index.ts:294-296`

**Problem:**
- `setTimeout(r, timeMs)` keeps DO alive during wait
- With alarm-based scheduling, we should hibernate instead
- Defeats the entire optimization we just did

**Break Point:** DO stays alive 24/7 = continuous billing

**Fix:**
```typescript
// Remove setTimeout, schedule next cycle immediately
// The wait time is handled by scheduling the next cycle at Date.now() + timeMs
// But we already do this! The setTimeout is unnecessary - remove it.
```

### 4. **Polling + WebSocket Redundancy** 🟡 HIGH
**Location:** `example/src/routes/mission/+page.svelte:421-424`

**Problem:**
- WebSocket for real-time updates
- **PLUS** polling every 500ms
- Doubles server load for no benefit
- Polling calls `getTasks()` which triggers `storage.list()`

**Break Point:** 100 users × 2 requests/second = 200 req/s just for polling

**Fix:**
```typescript
// Remove polling, rely on WebSocket only
// Add WebSocket reconnection with exponential backoff
// Fallback to polling only if WebSocket fails for >5s
```

## Over-Engineering Issues

### 5. **Effect-TS for Simple Operations** 🟡 MEDIUM
**Location:** Throughout `example/worker/index.ts`

**Problem:**
- Effect-TS adds complexity for simple async operations
- `yield* Effect.promise(() => ...)` is verbose
- No error recovery benefits here (errors are swallowed anyway)

**Reality Check:** This is a game loop, not a financial transaction system
- Simple `await` would be clearer
- Effect-TS shines for complex error handling/chaining - not needed here

**Fix:** Consider simplifying to plain async/await for game logic

### 6. **Client-Side Progress Calculation Drift** 🟡 MEDIUM
**Location:** `example/src/routes/mission/+page.svelte:140-152`

**Problem:**
- Progress calculated client-side: `(elapsed % node.timeMs) / node.timeMs`
- Drifts from server reality (network latency, DO eviction delays)
- Server has real cycle count, but client calculates from elapsed time

**Fix:**
```typescript
// Use server-provided cycle count + server timestamp
// Calculate: progress = (now - lastCycleTime) / timeMs
// Where lastCycleTime comes from server checkpoint
```

### 7. **Excessive Checkpoint Writes** 🟡 LOW
**Location:** `example/worker/index.ts:289-290, 362-367`

**Problem:**
- Checkpoint "step" at start (line 289)
- Then checkpointMultiple with step again (line 364)
- Redundant write

**Fix:** Remove first checkpoint, only batch at end

## Missing Critical Features

### 8. **No Rate Limiting** 🔴 CRITICAL
**Location:** `example/src/routes/mission/+page.svelte:208`

**Problem:**
- Users can spam `handleDeployMiner()` 
- No server-side validation of cost/resources
- Client-side check can be bypassed
- Can create unlimited miners

**Fix:**
```typescript
// Server-side validation in worker/index.ts:589
// Check resources BEFORE creating task
// Return 429 if rate limit exceeded
```

### 9. **No Cleanup Strategy** 🟡 HIGH
**Location:** No cleanup code found

**Problem:**
- Completed tasks accumulate forever
- Failed tasks accumulate forever  
- Old checkpoints never cleaned
- Storage grows unbounded

**Fix:**
```typescript
// Auto-cleanup completed tasks after 24h
// Cleanup failed tasks after 7d
// Or: Add manual cleanup endpoint
```

### 10. **Race Condition: Resource Deduction** 🟡 HIGH
**Location:** `example/worker/index.ts:600-631`

**Problem:**
- Client checks resources (line 220)
- Sends request
- Server checks resources (line 624)
- **Gap allows double-spending** if user opens 2 tabs

**Fix:**
```typescript
// Use transaction with conditional check
await txn.transaction(async (txn) => {
  const resources = await txn.get("resources");
  if (resources.copper < cost) throw new Error("Insufficient");
  resources.copper -= cost;
  await txn.put("resources", resources);
  // Then create miner task
});
```

### 11. **No Error Recovery for Global State** 🟡 MEDIUM
**Location:** `example/worker/index.ts:308-327`

**Problem:**
- If `global-state` task fails, ALL miners break
- No automatic recovery
- Manual intervention required

**Fix:**
```typescript
// Auto-recreate global-state on failure
// Or: Make miners resilient to missing global-state (queue deposits)
```

### 12. **No Monitoring/Observability** 🟡 LOW
**Problem:**
- No metrics on task execution time
- No alerts for failed tasks
- No visibility into DO performance
- Can't debug production issues

**Fix:**
- Add Cloudflare Analytics events
- Log task execution times
- Alert on high failure rates

## Architecture Recommendations

### Immediate Fixes (Do Now)
1. **Remove setTimeout** - Use pure alarm scheduling
2. **Debounce broadcasts** - Max 10 broadcasts/second
3. **Remove polling** - WebSocket only
4. **Add rate limiting** - Server-side validation

### Short-term (This Week)
5. **Shard DOs** - Hash-based or namespace-based
6. **Fix race conditions** - Transaction-based resource checks
7. **Add cleanup** - Auto-delete old tasks

### Long-term (If Scaling)
8. **Consider KV for global state** - Read-heavy, write-rare
9. **Simplify Effect-TS usage** - Only where error handling matters
10. **Add monitoring** - Cloudflare Analytics + custom metrics

## Cost Optimization Remaining

- **setTimeout issue** - Still billing for wait time (defeats alarm optimization)
- **Broadcast spam** - Unnecessary network egress costs
- **Polling** - Unnecessary request costs

## Summary Score

**Scalability:** 3/10 (single DO bottleneck, broadcast storms)
**Cost Efficiency:** 6/10 (alarm-based helps, but setTimeout hurts)
**Reliability:** 5/10 (no error recovery, race conditions)
**Maintainability:** 7/10 (code is clear, but Effect-TS adds complexity)

**Verdict:** Works for <50 miners, breaks at ~100, catastrophic at 500+

