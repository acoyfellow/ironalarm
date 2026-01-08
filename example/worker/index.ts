import { DurableObject } from "cloudflare:workers";
import { ReliableScheduler, SchedulerService } from "../../src/index";
import { Effect } from "effect";
import type { Task } from "../../src/index";
import { Hono } from "hono";

type Env = {
  TASK_SCHEDULER_DO: DurableObjectNamespace<TaskSchedulerDO>;
};

// Simple hash function for DO sharding
function getShardId(key: string, numShards: number = 3): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) & 0xffffffff;
  }
  return `scheduler-${Math.abs(hash) % numShards}`;
}

export class TaskSchedulerDO extends DurableObject {
  private scheduler!: ReliableScheduler;
  private app: Hono;
  private runningEffects: Set<string> = new Set(); // Track which tasks have active Effects
  private broadcastQueue: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: any, env: Env) {
    super(ctx, env);
    // Configure scheduler with concurrency limit to prevent CPU exhaustion
    // Default is 10 concurrent tasks, which is safe for most use cases
    this.scheduler = new ReliableScheduler(this.ctx.storage, { maxConcurrentTasks: 10 });
    this.app = new Hono();

    // Resume any "running" tasks that lost their Effect due to DO restart
    this.resumeRunningTasks();

    // Register agent-loop task using runSteps helper
    this.scheduler.register(
      "agent-loop",
      (taskId: string, params: unknown) =>
        Effect.gen(function* () {
          const svc = yield* SchedulerService;
          const p = params as Record<string, any>;
          const complexity = (p.complexity || "demo") as string;

          // Use provided stepCount/durationMs if available (from mission/2 randomization)
          // Otherwise use defaults based on complexity
          const durationMs = p.durationMs || (complexity === "demo" && (p.namespace === "mission2" || p.mission === "level2")
            ? 1000 + Math.random() * 4000 // Random 1-5s for mission/2
            : (() => {
              const durationMap: Record<string, number> = {
                "1s": 1000,
                "10s": 10000,
                demo: 60000, // 60s for homepage
                realistic: 3600000,
                production: 604800000,
                month: 2592000000,
                year: 31536000000,
              };
              return durationMap[complexity] || 60000;
            })());
          const stepCountMap: Record<string, number> = {
            "1s": 2,
            "10s": 3,
            demo: 5,
            realistic: 10,
            production: 20,
            month: 30,
            year: 50,
          };
          const stepCount = p.stepCount || stepCountMap[complexity] || 5;
          const stepDuration = Math.floor(durationMs / stepCount);


          const stepTemplates =
            (p.steps as string[]) ||
            [
              "researching",
              "analyzing",
              "synthesizing",
              "writing",
              "finalizing",
            ];
          const steps = stepTemplates.slice(0, stepCount);

          // Use runSteps - library handles all the complexity
          yield* svc.runSteps(taskId, steps, {
            stepDuration,
            result: "Task finished successfully",
            autoComplete: true, // Library auto-completes
            onStep: async (stepName, stepIndex) => {
              // Sub-steps for longer tasks - library handles pause checks & progress
              const subSteps =
                complexity === "production"
                  ? 5
                  : complexity === "realistic"
                    ? 3
                    : 1;

              await Effect.runPromise(svc.runSubSteps(
                taskId,
                stepName,
                stepIndex,
                steps.length,
                subSteps,
                stepDuration / subSteps
              ));
            },
          });
        })
    );

    // Register mine-asteroid task handler - simple mining game
    this.scheduler.register(
      "mine-asteroid",
      (taskId: string, params: unknown) =>
        Effect.gen(function* () {
          const svc = yield* SchedulerService;
          const p = params as Record<string, any>;
          const asteroidId = (p.asteroidId || "asteroid-1") as string;
          const capacity = (p.capacity || 10) as number; // How much this miner can carry
          const durationMs = (p.durationMs || 20000) as number; // Total mining time

          // Steps represent mining progress
          const steps: string[] = [];
          for (let i = 0; i < capacity; i++) {
            steps.push(`mining-${i + 1}`);
          }
          const stepDuration = Math.floor(durationMs / capacity);

          yield* svc.runSteps(taskId, steps, {
            stepDuration,
            autoComplete: false,
            onStep: async (stepName, stepIndex) => {
              // Update progress
              await Effect.runPromise(svc.checkpoint(taskId, "progress", {
                step: stepIndex + 1,
                total: capacity,
                asteroidId,
              }));
            },
          });

          // Mining complete - add resources to global state
          const globalTaskId = "global-state";
          let globalTask = yield* svc.getTask(globalTaskId);
          if (!globalTask) {
            yield* svc.runNow(globalTaskId, "global-state", {}, { maxRetries: Infinity });
            // Wait a bit for it to initialize
            // Removed setTimeout to allow DO hibernation
            globalTask = yield* svc.getTask(globalTaskId);
          }

          // Add resources
          const currentResources = ((yield* svc.getCheckpoint(globalTaskId, "resources")) || 0) as number;

          const newTotal = currentResources + capacity;
          yield* svc.checkpoint(globalTaskId, "resources", newTotal);

          // Update progress so frontend can see it
          yield* svc.checkpoint(globalTaskId, "lastUpdate", Date.now());

          // Mark task complete
          yield* svc.completeTask(taskId);
        })
    );

    // Register craft-item task handler
    this.scheduler.register(
      "craft-item",
      (taskId: string, params: unknown) =>
        Effect.gen(function* () {
          const svc = yield* SchedulerService;
          const p = params as Record<string, any>;
          const itemType = (p.itemType || "laser_drill") as string;
          const requiredOre = p.requiredOre || 50;
          const requiredEnergy = p.requiredEnergy || 20;

          const steps = ["check_inventory", "gather_materials", "refine", "assemble"];
          const stepDuration = 2000; // 2s per step

          yield* svc.runSteps(taskId, steps, {
            stepDuration,
            autoComplete: false,
            onStep: async (stepName, stepIndex) => {
              if (stepName === "check_inventory") {
                // Check if we have enough resources
                const inventory = ((await Effect.runPromise(svc.getCheckpoint("global-state", "inventory"))) ||
                  { ore: 0, energy: 0 }) as Record<string, number>;

                if ((inventory.ore || 0) < requiredOre || (inventory.energy || 0) < requiredEnergy) {
                  // Not enough resources - pause and wait
                  await Effect.runPromise(svc.pauseTask(taskId));
                   // Poll until resources are available
                   let attempts = 0;
                   while (attempts < 100) {
                     // Removed setTimeout to allow DO hibernation - poll immediately
                     const updatedInventory = ((await Effect.runPromise(svc.getCheckpoint("global-state", "inventory"))) ||
                       { ore: 0, energy: 0 }) as Record<string, number>;
                     if (
                       (updatedInventory.ore || 0) >= requiredOre &&
                       (updatedInventory.energy || 0) >= requiredEnergy
                     ) {
                       await Effect.runPromise(svc.resumeTask(taskId));
                       break;
                     }
                     attempts++;
                   }
                }
              } else if (stepName === "gather_materials") {
                // Consume resources
                const inventory = ((await Effect.runPromise(svc.getCheckpoint("global-state", "inventory"))) ||
                  { ore: 0, energy: 0 }) as Record<string, number>;
                inventory.ore = Math.max(0, (inventory.ore || 0) - requiredOre);
                inventory.energy = Math.max(0, (inventory.energy || 0) - requiredEnergy);
                await Effect.runPromise(svc.checkpoint("global-state", "inventory", inventory));
              } else if (stepName === "assemble") {
                // Add item to inventory
                const inventory = ((await Effect.runPromise(svc.getCheckpoint("global-state", "inventory"))) ||
                  { ore: 0, energy: 0, items: [] }) as Record<string, any>;
                if (!inventory.items) inventory.items = [];
                inventory.items.push({ type: itemType, quality: "rare" });
                await Effect.runPromise(svc.checkpoint("global-state", "inventory", inventory));
                await Effect.runPromise(svc.checkpoint(taskId, "item", { type: itemType, quality: "rare" }));
              }
            },
          });

          yield* svc.completeTask(taskId);
        })
    );

    // Register trade-item task handler
    this.scheduler.register(
      "trade-item",
      (sched: ReliableScheduler, taskId: string, params: unknown) =>
        Effect.gen(function* () {
          const p = params as Record<string, any>;
          const itemType = p.itemType || null; // null = sell first available item
          const sellPrice = p.sellPrice || 100;

          // Get inventory
          const inventory = ((yield* Effect.promise(() => sched.getCheckpoint("global-state", "inventory"))) ||
            { items: [] }) as Record<string, any>;
          if (!inventory.items) inventory.items = [];

          // Find item to sell
          let itemIndex = -1;
          if (itemType) {
            itemIndex = inventory.items.findIndex((item: any) => item.type === itemType);
          } else if (inventory.items.length > 0) {
            itemIndex = 0; // Sell first item
          }

          if (itemIndex >= 0) {
            // Remove item from inventory
            inventory.items.splice(itemIndex, 1);
            yield* Effect.promise(() => sched.checkpoint("global-state", "inventory", inventory));

            // Add money
            const currentMoney = ((yield* Effect.promise(() => sched.getCheckpoint("global-state", "money"))) || 0) as number;
            yield* Effect.promise(() => sched.checkpoint("global-state", "money", currentMoney + sellPrice));
            yield* Effect.promise(() => sched.checkpoint(taskId, "sold", { price: sellPrice }));
          }

          yield* Effect.promise(() => sched.completeTask(taskId));
        })
    );

    // Store reference to this for broadcasting
    const doInstance = this;

    // Register mine-resource-loop task handler - alarm-based mining loop
    this.scheduler.register(
      "mine-resource-loop",
      (sched: ReliableScheduler, taskId: string, params: unknown) => {
        const p = params as Record<string, any>;
        const nodeId = (p.nodeId || "copper") as string;
        const baseYield = (p.yield || 1) as number;
        const timeMs = (p.timeMs || 4000) as number;

        const miningLoop = Effect.gen(function* () {
          // Check if task is paused or cancelled before processing
          const task = yield* Effect.promise(() => sched.getTask(taskId));
          if (!task || task.status === "paused") {
            return false; // Don't reschedule if cancelled/paused
          }

          // Recover from failed or completed state
          if (task.status === "failed" || task.status === "completed") {
            // Use checkpoint to recover - it will set status back to "running"
            yield* Effect.promise(() => sched.checkpoint(taskId, "_recovered", true));
          }

          // Get or initialize cycle counter
          let cycle = ((yield* Effect.promise(() => sched.getCheckpoint(taskId, "cycle"))) || 0) as number;

          // Calculate logarithmic yield multiplier based on cycles
          // Formula: baseYield * (1 + log10(cycle + 1))
          // cycle 0: 1x, cycle 9: 2x, cycle 99: 3x, cycle 999: 4x, etc.
          const yieldMultiplier = 1 + Math.log10(cycle + 1);
          const actualYield = Math.floor(baseYield * yieldMultiplier);

          // Deposit resources to global state - ensure it's healthy first
          const globalTaskId = `mission4-global-state`;
          yield* Effect.promise(() => doInstance.ensureGlobalStateHealthy("mission4"));
          let globalTask = yield* Effect.promise(() => sched.getTask(globalTaskId));

          if (globalTask) {
            // Use transaction to prevent race conditions when multiple miners update simultaneously
            yield* Effect.promise(() =>
              doInstance.ctx.storage.transaction(async (txn: any) => {
                const task = await txn.get(`task:${globalTaskId}`) as Task | undefined;
                if (!task) return;

                const rawResources = task.progress?.resources;
                let currentResources: Record<string, number>;
                if (rawResources === undefined || rawResources === null) {
                  currentResources = { copper: 0 };
                } else if (typeof rawResources === "number") {
                  currentResources = { copper: rawResources };
                } else {
                  currentResources = rawResources as Record<string, number>;
                }

                // Add mined resources (with logarithmic multiplier)
                const resourceType = nodeId;
                currentResources[resourceType] = (currentResources[resourceType] || 0) + actualYield;
                currentResources.copper = (currentResources.copper || 0) + actualYield;

                // Update task progress atomically
                task.progress = task.progress || {};
                task.progress.resources = currentResources;
                await txn.put(`task:${globalTaskId}`, task);
              })
            );

            // Broadcast resources update
            yield* Effect.promise(() => doInstance.broadcastResources("mission4"));
          }

          // Increment cycle and batch checkpoint updates (step and cycle) into single write
          cycle++;
          yield* Effect.promise(() =>
            sched.checkpointMultiple(taskId, {
              step: `mining-${nodeId}`,
              cycle: cycle
            })
          );

          // Trigger broadcast to update cycle counter
          yield* Effect.promise(() => doInstance.triggerBroadcast());

          return true; // Success, should reschedule
        });

        // Wrap in error handling to ensure we ALWAYS reschedule, even on error
        return Effect.gen(function* () {
          // Use Effect.catchAll to handle errors and ensure rescheduling
          const shouldReschedule = yield* Effect.catchAll(miningLoop, (error) => {
            console.error(`[mine-resource-loop] Error in task ${taskId}:`, error);
            // On error, check if task still exists and is valid
            return Effect.gen(function* () {
              const task = yield* Effect.promise(() => sched.getTask(taskId));
              // Only reschedule if task is still valid (not cancelled/paused)
              // Note: failed/completed tasks will be recovered above, so we allow them
              return task && task.status !== "paused";
            });
          });

          // ALWAYS reschedule the next cycle if task is still valid
          // This ensures the task never stops running
          if (shouldReschedule) {
            const nextCycleTime = Date.now() + timeMs;
            yield* Effect.catchAll(
              Effect.promise(() => sched.schedule(nextCycleTime, taskId, "mine-resource-loop", params)),
              (error) => {
                console.error(`[mine-resource-loop] Failed to reschedule task ${taskId}:`, error);
                // Retry once with delay
                return Effect.gen(function* () {
                  yield* Effect.promise(() => new Promise<void>((r) => setTimeout(r, 100)));
                  yield* Effect.promise(() => sched.schedule(nextCycleTime, taskId, "mine-resource-loop", params));
                });
              }
            );
          }
        });
      }
    );

    // Register sell-miner task handler - sells a miner and adds copper
    this.scheduler.register(
      "sell-miner",
      (sched: ReliableScheduler, taskId: string, params: unknown) =>
        Effect.gen(function* () {
          const p = params as Record<string, any>;
          const taskIdToCancel = p.taskIdToCancel as string;
          const copperToAdd = (p.copperToAdd || 0) as number;

          if (!taskIdToCancel || copperToAdd <= 0) {
            yield* Effect.promise(() => sched.completeTask(taskId));
            return;
          }

          // Cancel the miner task
          yield* Effect.promise(() => sched.cancelTask(taskIdToCancel));

          // Add copper to global state - ensure it's healthy first
          const globalTaskId = `mission4-global-state`;
          yield* Effect.promise(() => doInstance.ensureGlobalStateHealthy("mission4"));
          let globalTask = yield* Effect.promise(() => sched.getTask(globalTaskId));

          if (globalTask) {
            // Use transaction to prevent race conditions
            yield* Effect.promise(() =>
              doInstance.ctx.storage.transaction(async (txn: any) => {
                const task = await txn.get(`task:${globalTaskId}`) as Task | undefined;
                if (!task) return;

                const rawResources = task.progress?.resources;
                let currentResources: Record<string, number>;
                if (rawResources === undefined || rawResources === null) {
                  currentResources = { copper: 0 };
                } else if (typeof rawResources === "number") {
                  currentResources = { copper: rawResources };
                } else {
                  currentResources = rawResources as Record<string, number>;
                }

                // Add copper from sale
                currentResources.copper = (currentResources.copper || 0) + copperToAdd;

                // Update task progress atomically
                task.progress = task.progress || {};
                task.progress.resources = currentResources;
                await txn.put(`task:${globalTaskId}`, task);
              })
            );

            yield* Effect.promise(() => doInstance.broadcastResources("mission4"));
          }

          yield* Effect.promise(() => sched.completeTask(taskId));
        })
    );

    // Register global-state task handler - alarm-based state keeper
    this.scheduler.register(
      "global-state",
      (taskId: string, params: unknown) =>
        Effect.gen(function* () {
          const svc = yield* SchedulerService;
          // Initialize resources if needed - handle legacy number format
          const resources = yield* svc.getCheckpoint(taskId, "resources");
          if (resources === undefined || typeof resources === "number") {
            const initialResources = typeof resources === "number"
              ? { copper: resources }
              : { copper: 0 };
            yield* svc.checkpoint(taskId, "resources", initialResources);
          }

          // Initialize speed multiplier if needed
          const speed = yield* svc.getCheckpoint(taskId, "speedMultiplier");
          if (speed === undefined) {
            yield* svc.checkpoint(taskId, "speedMultiplier", 1);
          }

          // Check if task is still valid
          const task = yield* svc.getTask(taskId);
          if (!task) return;

          // Recover from failed or completed state
          if (task.status === "failed" || task.status === "completed") {
            // Use checkpoint to recover - it will set status back to "running"
            yield* Effect.promise(() => sched.checkpoint(taskId, "_recovered", true));
          }

          // Clear completed flag if somehow set
          if (task.progress?.completed === true) {
            yield* Effect.promise(() => sched.checkpoint(taskId, "completed", false));
          }

          // Schedule next wake in 30 seconds using alarm-based scheduling
          // This allows the DO to hibernate between checks
          const nextWakeTime = Date.now() + 30000;
          yield* Effect.promise(() =>
            sched.schedule(nextWakeTime, taskId, "global-state", params)
          );
        })
    );

    // Register speed-upgrade task handler - one-shot task to upgrade speed
    this.scheduler.register(
      "speed-upgrade",
      (sched: ReliableScheduler, taskId: string, params: unknown) =>
        Effect.gen(function* () {
          const p = params as Record<string, any>;
          const cost = (p.cost || 0) as number;
          const globalTaskId = "mission4-global-state";

          // Ensure global state is healthy first
          yield* Effect.promise(() => doInstance.ensureGlobalStateHealthy("mission4"));

          // Get global state
          const globalTask = yield* Effect.promise(() => sched.getTask(globalTaskId));
          if (!globalTask) {
            yield* Effect.promise(() => sched.completeTask(taskId));
            return;
          }

          // Use transaction to prevent race conditions
          const canAfford = yield* Effect.promise(() =>
            doInstance.ctx.storage.transaction(async (txn: any) => {
              const task = await txn.get(`task:${globalTaskId}`) as Task | undefined;
              if (!task) return false;

              const rawResources = task.progress?.resources;
              let currentResources: Record<string, number>;
              if (rawResources === undefined || rawResources === null) {
                currentResources = { copper: 0 };
              } else if (typeof rawResources === "number") {
                currentResources = { copper: rawResources };
              } else {
                currentResources = rawResources as Record<string, number>;
              }

              const currentSpeed = (task.progress?.speedMultiplier || 1) as number;

              // Check if can afford
              if ((currentResources.copper || 0) < cost) {
                return false;
              }

              // Deduct cost and increment speed atomically
              currentResources.copper = (currentResources.copper || 0) - cost;
              task.progress = task.progress || {};
              task.progress.resources = currentResources;
              task.progress.speedMultiplier = currentSpeed + 1;
              await txn.put(`task:${globalTaskId}`, task);
              return true;
            })
          );

          if (!canAfford) {
            yield* Effect.promise(() => sched.completeTask(taskId));
            return;
          }

          // Broadcast update
          yield* Effect.promise(() => doInstance.broadcastResources("mission4"));

          // Complete this task
          yield* Effect.promise(() => sched.completeTask(taskId));
        })
    );

    // Setup routes
    this.setupRoutes();
  }

  // Resume running tasks after DO restart - only for infinite-loop task types
  // Also recover failed tasks that should be running
  private async resumeRunningTasks() {
    const RESUMABLE_TASKS = ["mine-resource-loop", "global-state"];
    const tasks = await this.scheduler.getTasks();
    const now = Date.now();

    for (const task of tasks) {
      if (
        !this.runningEffects.has(task.taskId) &&
        RESUMABLE_TASKS.includes(task.taskName) &&
        (task.status === "running" || task.status === "failed" || task.status === "completed" || task.status === "pending")
      ) {
        // Recover failed/completed tasks by checkpointing them (checkpoint method now auto-recovers failed tasks)
        if (task.status === "failed" || task.status === "completed") {
          // Use checkpoint to recover - it will automatically set status back to "running"
          await this.scheduler.checkpoint(task.taskId, "_recovered", true);
        }

        // For miners: if scheduled time is way in the past or never scheduled, reschedule for immediate execution
        if (task.taskName === "mine-resource-loop") {
          const scheduledAt = task.scheduledAt || 0;
          const isStuck = scheduledAt === 0 || (scheduledAt > 0 && now > scheduledAt + 5000);

          if (isStuck) {
            const reason = scheduledAt === 0 ? "never scheduled" : `${Math.round((now - scheduledAt) / 1000)}s overdue`;
            console.log(`[resumeRunningTasks] Resuming stuck miner ${task.taskId}: ${reason}, rescheduling for immediate execution`);
            const params = task.params as Record<string, any>;
            // Schedule for immediate execution (now - 1ms so it's due immediately)
            await this.scheduler.schedule(now - 1, task.taskId, "mine-resource-loop", params);
            continue; // Don't run handler directly, let alarm process it
          }
        }

        this.runningEffects.add(task.taskId);
        this.runTaskHandler(task.taskId, task.taskName, task.params);
      }
    }
  }

  // Ensure global-state task exists and is healthy - call this from multiple places
  async ensureGlobalStateHealthy(namespace: string = "mission4") {
    const globalTaskId = `${namespace}-global-state`;
    let globalTask = await this.scheduler.getTask(globalTaskId);

    // Recreate if missing, completed, or failed - preserve resources
    if (!globalTask || globalTask.status === "completed" || globalTask.status === "failed") {
      const savedResources = globalTask?.progress?.resources;
      if (globalTask) {
        await this.scheduler.cancelTask(globalTaskId);
      }
      await this.scheduler.runNow(globalTaskId, "global-state", { namespace }, { maxRetries: Infinity });
      globalTask = await this.scheduler.getTask(globalTaskId);

      // Restore resources if they existed
      if (savedResources !== undefined && globalTask) {
        const resourcesToRestore = typeof savedResources === "number"
          ? { copper: savedResources }
          : (savedResources as Record<string, number>);
        await this.scheduler.checkpoint(globalTaskId, "resources", resourcesToRestore);
      }
    }

    return globalTask;
  }

  // Run a task handler and track it
  private async runTaskHandler(taskId: string, taskName: string, params: unknown) {
    const handler = this.scheduler.getHandler(taskName);
    if (!handler) {
      this.runningEffects.delete(taskId);
      return;
    }
    try {
      await Effect.runPromise(handler(this.scheduler, taskId, params));
    } catch {
      // Task threw - will be cleaned up
    } finally {
      this.runningEffects.delete(taskId);
    }
  }

  // Broadcast task updates to all connected clients
  private broadcast(message: { type: string; data: any }) {
    const payload = JSON.stringify(message);
    // Use Durable Object's getWebSockets() for hibernation-safe WebSocket access
    const sockets = this.ctx.getWebSockets();
    let sent = 0;
    for (const ws of sockets) {
      // Only send to open sockets (readyState 1 = OPEN)
      if (ws.readyState !== 1) {
        try { ws.close(); } catch { }
        continue;
      }
      try {
        ws.send(payload);
        sent++;
      } catch (error) {
        // Socket died, try to close it
        try { ws.close(); } catch { }
      }
    }
    if (sent > 0 || sockets.length > 0) {
      console.log(`[broadcast] Sent ${message.type} to ${sent}/${sockets.length} clients`);
    }
  }

  // Helper to trigger broadcast from within task handlers
  // Debounced to max once per 100ms to prevent broadcast storms
  async triggerBroadcast() {
    if (this.broadcastQueue) {
      // Already queued, skip
      return;
    }
    this.broadcastQueue = setTimeout(async () => {
      const tasks = await this.scheduler.getCachedTasks();
      const allTasks = tasks.length > 0 ? tasks : await this.scheduler.getTasks();
      this.broadcast({
        type: "tasks",
        data: allTasks.map((t) => this.formatTaskForUI(t)),
      });
      this.broadcastQueue = null;
    }, 100);
  }

  // Lightweight broadcast for resources updates only
  async broadcastResources(namespace: string = "mission4") {
    const globalTaskId = `${namespace}-global-state`;
    const rawResources = await this.scheduler.getCheckpoint(globalTaskId, "resources");

    let resources: Record<string, number>;
    if (rawResources === undefined || rawResources === null) {
      resources = { copper: 0 };
    } else if (typeof rawResources === "number") {
      resources = { copper: rawResources };
    } else {
      resources = rawResources as Record<string, number>;
    }

    const speedMultiplier = (await this.scheduler.getCheckpoint(globalTaskId, "speedMultiplier")) as number || 1;

    console.log(`[broadcastResources] Sending resources:`, resources);
    this.broadcast({
      type: "resources",
      data: {
        namespace,
        resources,
        speedMultiplier,
      },
    });
  }

  private setupRoutes() {
    // Start a new task
    this.app.post("/task/start", async (c) => {
      const params = await c.req.json();
      // Determine namespace prefix from params
      const namespace = params.namespace || "task"; // Default to "task" for homepage

      // Use fixed ID for global-state tasks, generated ID for others
      const taskId = params.taskName === "global-state"
        ? (namespace ? `${namespace}-global-state` : "global-state")
        : ReliableScheduler.generateTaskId(namespace);

      // Handle cost deduction for mine-resource-loop tasks
      if (params.taskName === "mine-resource-loop" && params.cost !== undefined && params.cost > 0) {
        const globalTaskId = namespace ? `${namespace}-global-state` : "global-state";
        // Ensure global state is healthy before checking resources
        await this.ensureGlobalStateHealthy(namespace || "mission4");
        const globalTask = await Effect.runPromise(this.scheduler.getTask(globalTaskId));

        if (globalTask) {
          // Use transaction to prevent race conditions (double-spending)
          const updated = await this.ctx.storage.transaction(async (txn: any) => {
            const task = await txn.get(`task:${globalTaskId}`) as Task | undefined;
            if (!task) return false;

            const rawResources = task.progress?.resources;
            let currentResources: Record<string, number>;
            if (rawResources === undefined || rawResources === null) {
              currentResources = { copper: 0 };
            } else if (typeof rawResources === "number") {
              currentResources = { copper: rawResources };
            } else {
              currentResources = rawResources as Record<string, number>;
            }

            const currentCopper = currentResources.copper || 0;
            if (currentCopper < params.cost) {
              return false; // Insufficient resources
            }

            // Deduct cost atomically
            currentResources.copper = currentCopper - params.cost;
            task.progress.resources = currentResources;
            await txn.put(`task:${globalTaskId}`, task);
            return true;
          });

          if (!updated) {
            const currentResources = ((await Effect.runPromise(this.scheduler.getCheckpoint(globalTaskId, "resources"))) || {}) as Record<string, number>;
            const currentCopper = currentResources.copper || 0;
            return c.json({ error: `Insufficient resources. Need ${params.cost} Copper, have ${currentCopper}` }, 400);
          }

          // Invalidate cache after transaction
          (this.scheduler as any).invalidateCache();
        }
      }

      // Infinite loop tasks get unlimited retries
      const isInfiniteLoop = params.taskName === "mine-resource-loop";
       await Effect.runPromise(this.scheduler.runNow(
         taskId,
         params.taskName || "agent-loop",
         params,
         isInfiniteLoop ? { maxRetries: Infinity } : undefined
       ));

      // Broadcast update
      const tasks = await Effect.runPromise(this.scheduler.getTasks());
      this.broadcast({
        type: "tasks",
        data: tasks.map((t) => this.formatTaskForUI(t)),
      });

      return c.json({ taskId, status: "started" });
    });

    // Get task status
    this.app.get("/task/status", async (c) => {
      const taskId = c.req.query("taskId");
      if (!taskId) {
        return c.json({ error: "Missing taskId" }, 400);
      }

      const task = await Effect.runPromise(this.scheduler.getTask(taskId));
      if (!task) {
        return c.json({ error: "Task not found" }, 404);
      }

      return c.json(this.formatTaskForUI(task));
    });

    // Get all tasks (optionally filtered by namespace)
    this.app.get("/tasks", async (c) => {
      const namespace = c.req.query("namespace");

      // Ensure global-state is healthy when fetching tasks (recovery check)
      if (namespace) {
        try {
          await this.ensureGlobalStateHealthy(namespace);
        } catch (error) {
          console.error("[GET /tasks] Failed to ensure global-state healthy:", error);
        }
      }

      const tasks = await Effect.runPromise(this.scheduler.getTasks());
      const filteredTasks = namespace
        ? tasks.filter((t) => t.taskId.startsWith(`${namespace}-`))
        : tasks;
      return c.json(filteredTasks.map((t) => this.formatTaskForUI(t)));
    });

    // Pause a task
    this.app.post("/task/pause", async (c) => {
      const { taskId } = await c.req.json();
      if (!taskId) {
        return c.json({ error: "Missing taskId" }, 400);
      }

      const paused = await Effect.runPromise(this.scheduler.pauseTask(taskId));
      if (!paused) {
        return c.json({ error: "Task not found or cannot be paused" }, 404);
      }

      const tasks = await Effect.runPromise(this.scheduler.getTasks());
      this.broadcast({
        type: "tasks",
        data: tasks.map((t) => this.formatTaskForUI(t)),
      });

      return c.json({ taskId, status: "paused" });
    });

    // Resume a task
    this.app.post("/task/resume", async (c) => {
      const { taskId } = await c.req.json();
      if (!taskId) {
        return c.json({ error: "Missing taskId" }, 400);
      }

      const resumed = await Effect.runPromise(this.scheduler.resumeTask(taskId));
      if (!resumed) {
        return c.json({ error: "Task not found or not paused" }, 404);
      }

      const tasks = await Effect.runPromise(this.scheduler.getTasks());
      this.broadcast({
        type: "tasks",
        data: tasks.map((t) => this.formatTaskForUI(t)),
      });

      return c.json({ taskId, status: "resumed" });
    });

    // Cancel a task
    this.app.post("/task/cancel", async (c) => {
      const { taskId } = await c.req.json();
      if (!taskId) {
        return c.json({ error: "Missing taskId" }, 400);
      }

      const cancelled = await Effect.runPromise(this.scheduler.cancelTask(taskId));
      if (!cancelled) {
        return c.json({ error: "Task not found" }, 404);
      }

      const tasks = await Effect.runPromise(this.scheduler.getTasks());
      this.broadcast({
        type: "tasks",
        data: tasks.map((t) => this.formatTaskForUI(t)),
      });

      return c.json({ taskId, status: "cancelled" });
    });

    // Clear completed tasks
    this.app.post("/tasks/clear", async (c) => {
      const count = await Effect.runPromise(this.scheduler.clearCompleted());

      const tasks = await Effect.runPromise(this.scheduler.getTasks());
      this.broadcast({
        type: "tasks",
        data: tasks.map((t) => this.formatTaskForUI(t)),
      });

      return c.json({ count, status: "cleared" });
    });

    // Reset level - clear all tasks for a namespace
    this.app.post("/tasks/reset", async (c) => {
      const { namespace } = await c.req.json();
      if (!namespace) {
        return c.json({ error: "Missing namespace" }, 400);
      }

      // Get all tasks and filter by namespace
      const allTasks = await this.scheduler.getTasks();
      const namespaceTasks = allTasks.filter((t) =>
        t.taskId.startsWith(`${namespace}-`)
      );

      // Cancel/delete all tasks for this namespace
      let count = 0;
      for (const task of namespaceTasks) {
        await this.scheduler.cancelTask(task.taskId);
        count++;
      }

      const tasks = await Effect.runPromise(this.scheduler.getTasks());
      this.broadcast({
        type: "tasks",
        data: tasks.map((t) => this.formatTaskForUI(t)),
      });

      return c.json({ count, status: "reset" });
    });

    // WebSocket endpoint
    this.app.get("/ws", async (c) => {
      const upgradeHeader = c.req.header("upgrade");
      if (upgradeHeader !== "websocket") {
        return c.text("Expected WebSocket", 426);
      }

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      // Accept the WebSocket connection using Durable Object's hibernation API
      this.ctx.acceptWebSocket(server);

      // Ensure global-state is healthy before sending initial state
      try {
        await this.ensureGlobalStateHealthy("mission4");
      } catch (error) {
        console.error("[WS] Failed to ensure global-state healthy:", error);
      }

      // Send initial state
      const tasks = await Effect.runPromise(this.scheduler.getTasks());
      server.send(JSON.stringify({
        type: "tasks",
        data: tasks.map((t) => this.formatTaskForUI(t)),
      }));

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    });
  }

  async fetch(request: Request): Promise<Response> {
    // CRITICAL: Recover stuck tasks on every wake-up (handles hibernation recovery)
    // This ensures miners resume even if DO hibernated for hours/days
    try {
      // Diagnostic logging: check task states on wake-up
      const tasks = await Effect.runPromise(this.scheduler.getTasks());
      const miners = tasks.filter(t => t.taskName === "mine-resource-loop" && t.taskId.startsWith("mission4-"));
      console.log(`[fetch] DO woke up: ${miners.length} miners found`);

      // Log each miner's state for diagnosis
      for (const miner of miners) {
        const scheduledAt = miner.scheduledAt || 0;
        const age = scheduledAt > 0 ? Date.now() - scheduledAt : -1;
        console.log(`[fetch] Miner ${miner.taskId}: status=${miner.status}, scheduled=${scheduledAt}, age=${age > 0 ? Math.round(age / 1000) + 's' : 'never'}`);
      }

      await this.ensureGlobalStateHealthy("mission4");
      const recovered = await this.scheduler.recoverStuckTasks(["mine-resource-loop", "global-state"]);
      if (recovered > 0) {
        console.log(`[fetch] Recovered ${recovered} stuck task(s) after hibernation, triggering alarm to process them`);
        // Trigger alarm immediately to process recovered tasks
        await Effect.runPromise(this.scheduler.alarm());
      }
    } catch (error) {
      console.error("[fetch] Failed recovery:", error);
    }

    return this.app.fetch(request);
  }

  // Handle WebSocket close events (called by Durable Object runtime)
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    // WebSocket cleanup handled by runtime
  }

  // Handle WebSocket error events (called by Durable Object runtime)
  async webSocketError(ws: WebSocket, error: unknown) {
    console.error("[WS] Error:", error);
  }

  // Handle WebSocket messages (called by Durable Object runtime)
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Can handle client messages here if needed
  }

  async alarm() {
    const startTime = Date.now();

    // CRITICAL: Recover stuck tasks before alarm processing
    try {
      const tasksBefore = await this.scheduler.getTasks();
      const minersBefore = tasksBefore.filter(t => t.taskName === "mine-resource-loop" && t.taskId.startsWith("mission4-"));
      console.log(`[alarm] Processing alarm: ${minersBefore.length} miners before recovery`);

      const recovered = await this.scheduler.recoverStuckTasks(["mine-resource-loop", "global-state"]);
      if (recovered > 0) {
        console.log(`[alarm] Recovered ${recovered} stuck task(s) before processing`);
      }
    } catch (error) {
      console.error("[alarm] Failed recovery:", error);
    }

    await this.scheduler.alarm();

    // Ensure global-state is healthy after alarm processing
    try {
      await this.ensureGlobalStateHealthy("mission4");
    } catch (error) {
      console.error("[alarm] Failed to ensure global-state healthy:", error);
    }

    // Recover again after alarm (in case alarm processing created new stuck tasks)
    try {
      const recoveredAfter = await this.scheduler.recoverStuckTasks(["mine-resource-loop", "global-state"]);
      if (recoveredAfter > 0) {
        console.log(`[alarm] Recovered ${recoveredAfter} stuck task(s) after processing`);
      }
    } catch (error) {
      console.error("[alarm] Failed recovery (post-alarm):", error);
    }

    // Broadcast after alarm processing - use cached tasks if available
    const cachedTasks = this.scheduler.getCachedTasks();
    const tasks = cachedTasks.length > 0 ? cachedTasks : await this.scheduler.getTasks();
    this.broadcast({
      type: "tasks",
      data: tasks.map((t) => this.formatTaskForUI(t)),
    });

    // Execution time monitoring
    const duration = Date.now() - startTime;
    if (duration > 10000) {
      console.error(`[alarm] CRITICAL: Took ${duration}ms - likely approaching CPU limit`);
    } else if (duration > 5000) {
      console.warn(`[alarm] WARNING: Took ${duration}ms - monitor CPU usage`);
    } else {
      console.log(`[alarm] Completed in ${duration}ms`);
    }
  }

  // Health check: ensure all miners are running/rescheduled
  // This runs periodically to catch miners that stopped after long evictions
  private async healthCheckMiners() {
    const tasks = await this.scheduler.getTasks();
    const miners = tasks.filter(
      (t) => t.taskName === "mine-resource-loop" && t.taskId.startsWith("mission4-")
    );

    for (const miner of miners) {
      // If miner is in a bad state, recover it
      if (miner.status === "failed" || miner.status === "completed") {
        if (!this.runningEffects.has(miner.taskId)) {
          console.log(`[healthCheck] Recovering miner ${miner.taskId} from ${miner.status}`);
          await this.scheduler.checkpoint(miner.taskId, "_recovered", true);
          this.runningEffects.add(miner.taskId);
          this.runTaskHandler(miner.taskId, miner.taskName, miner.params);
        }
      }
      // If miner is running but scheduled time is way in the past (hibernated), reschedule it immediately
      else if (miner.status === "running" || miner.status === "pending") {
        const scheduledAt = miner.scheduledAt || 0;
        const now = Date.now();
        const params = miner.params as Record<string, any>;
        const timeMs = (params.timeMs || 4000) as number;

        // If scheduled time is more than 1 minute in the past, it's stuck - reschedule immediately
        if (scheduledAt > 0 && now > scheduledAt + 60000) {
          console.log(`[healthCheck] Rescheduling stuck miner ${miner.taskId} (scheduled ${Math.round((now - scheduledAt) / 1000)}s ago)`);
          // Reschedule for immediate execution (now - 1ms so it's due immediately)
          await this.scheduler.schedule(now - 1, miner.taskId, "mine-resource-loop", params);
        }
        // If miner has no scheduled time but should be running, reschedule it
        else if (scheduledAt === 0 && miner.status === "running") {
          console.log(`[healthCheck] Miner ${miner.taskId} has no scheduled time, rescheduling for immediate execution`);
          await this.scheduler.schedule(now - 1, miner.taskId, "mine-resource-loop", params);
        }
      }
    }
  }

  private formatTaskForUI(task: Task): any {
    const formatted = this.scheduler.formatTaskForUI(task);
    // Add custom fields
    formatted.complexity = (task.params as any)?.complexity || "demo";
    // Include params so frontend can access type, namespace, etc.
    formatted.params = task.params;
    // Include error information if task failed
    if (task.status === "failed" && task.progress?.error) {
      formatted.error = task.progress.error;
    }
    return formatted;
  }
}

// Worker entry point
const workerApp = new Hono();

workerApp.on(["GET", "POST"], "/task/*", async (c) => {
  const env = c.env as Env;
  const id = env.TASK_SCHEDULER_DO.idFromName(getShardId("scheduler"));
  const doInstance = env.TASK_SCHEDULER_DO.get(id);
  return await doInstance.fetch(c.req.raw);
});

workerApp.on(["GET", "POST"], "/tasks*", async (c) => {
  const env = c.env as Env;
  const id = env.TASK_SCHEDULER_DO.idFromName(getShardId("scheduler"));
  const doInstance = env.TASK_SCHEDULER_DO.get(id);
  return await doInstance.fetch(c.req.raw);
});

workerApp.get("/ws", async (c) => {
  const env = c.env as Env;
  const id = env.TASK_SCHEDULER_DO.idFromName(getShardId("scheduler"));
  const doInstance = env.TASK_SCHEDULER_DO.get(id);
  return await doInstance.fetch(c.req.raw);
});

export default {
  async fetch(request: Request, env: Env) {
    try {
      return await workerApp.fetch(request, env);
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
