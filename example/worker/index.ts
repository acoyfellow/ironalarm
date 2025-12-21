import { DurableObject } from "cloudflare:workers";
import { ReliableScheduler } from "../../src/index";
import { Effect } from "effect";
import type { Task } from "../../src/index";
import { Hono } from "hono";

type Env = {
  TASK_SCHEDULER_DO: DurableObjectNamespace<TaskSchedulerDO>;
};

export class TaskSchedulerDO extends DurableObject {
  private scheduler!: ReliableScheduler;
  private app: Hono;
  private runningEffects: Set<string> = new Set(); // Track which tasks have active Effects

  constructor(ctx: any, env: Env) {
    super(ctx, env);
    this.scheduler = new ReliableScheduler(this.ctx.storage);
    this.app = new Hono();

    // Resume any "running" tasks that lost their Effect due to DO restart
    this.resumeRunningTasks();

    // Register agent-loop task using runSteps helper
    this.scheduler.register(
      "agent-loop",
      (sched: ReliableScheduler, taskId: string, params: unknown) =>
        Effect.gen(function* () {
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
          yield* Effect.promise(() =>
            sched.runSteps(taskId, steps, {
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

                await sched.runSubSteps(
                  taskId,
                  stepName,
                  stepIndex,
                  steps.length,
                  subSteps,
                  stepDuration / subSteps
                );
              },
            })
          );
        })
    );

    // Register mine-asteroid task handler - simple mining game
    this.scheduler.register(
      "mine-asteroid",
      (sched: ReliableScheduler, taskId: string, params: unknown) =>
        Effect.gen(function* () {
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

          yield* Effect.promise(() =>
            sched.runSteps(taskId, steps, {
              stepDuration,
              autoComplete: false,
              onStep: async (stepName, stepIndex) => {
                // Update progress
                await sched.checkpoint(taskId, "progress", {
                  step: stepIndex + 1,
                  total: capacity,
                  asteroidId,
                });
              },
            })
          );

          // Mining complete - add resources to global state
          const globalTaskId = "global-state";
          let globalTask = yield* Effect.promise(() => sched.getTask(globalTaskId));
          if (!globalTask) {
            yield* Effect.promise(() => sched.runNow(globalTaskId, "global-state", {}, { maxRetries: Infinity }));
            // Wait a bit for it to initialize
            yield* Effect.promise(() => new Promise(resolve => setTimeout(resolve, 100)));
            globalTask = yield* Effect.promise(() => sched.getTask(globalTaskId));
          }

          // Add resources
          const currentResources = ((yield* Effect.promise(() =>
            sched.getCheckpoint(globalTaskId, "resources")
          )) || 0) as number;

          const newTotal = currentResources + capacity;
          yield* Effect.promise(() =>
            sched.checkpoint(globalTaskId, "resources", newTotal)
          );

          // Update progress so frontend can see it
          yield* Effect.promise(() =>
            sched.checkpoint(globalTaskId, "lastUpdate", Date.now())
          );

          // Mark task complete
          yield* Effect.promise(() => sched.completeTask(taskId));
        })
    );

    // Register craft-item task handler
    this.scheduler.register(
      "craft-item",
      (sched: ReliableScheduler, taskId: string, params: unknown) =>
        Effect.gen(function* () {
          const p = params as Record<string, any>;
          const itemType = (p.itemType || "laser_drill") as string;
          const requiredOre = p.requiredOre || 50;
          const requiredEnergy = p.requiredEnergy || 20;

          const steps = ["check_inventory", "gather_materials", "refine", "assemble"];
          const stepDuration = 2000; // 2s per step

          yield* Effect.promise(() =>
            sched.runSteps(taskId, steps, {
              stepDuration,
              autoComplete: false,
              onStep: async (stepName, stepIndex) => {
                if (stepName === "check_inventory") {
                  // Check if we have enough resources
                  const inventory = ((await sched.getCheckpoint("global-state", "inventory")) ||
                    { ore: 0, energy: 0 }) as Record<string, number>;

                  if ((inventory.ore || 0) < requiredOre || (inventory.energy || 0) < requiredEnergy) {
                    // Not enough resources - pause and wait
                    await sched.pauseTask(taskId);
                    // Poll until resources are available
                    let attempts = 0;
                    while (attempts < 100) {
                      await new Promise((r) => setTimeout(r, 500));
                      const updatedInventory = ((await sched.getCheckpoint("global-state", "inventory")) ||
                        { ore: 0, energy: 0 }) as Record<string, number>;
                      if (
                        (updatedInventory.ore || 0) >= requiredOre &&
                        (updatedInventory.energy || 0) >= requiredEnergy
                      ) {
                        await sched.resumeTask(taskId);
                        break;
                      }
                      attempts++;
                    }
                  }
                } else if (stepName === "gather_materials") {
                  // Consume resources
                  const inventory = ((await sched.getCheckpoint("global-state", "inventory")) ||
                    { ore: 0, energy: 0 }) as Record<string, number>;
                  inventory.ore = Math.max(0, (inventory.ore || 0) - requiredOre);
                  inventory.energy = Math.max(0, (inventory.energy || 0) - requiredEnergy);
                  await sched.checkpoint("global-state", "inventory", inventory);
                } else if (stepName === "assemble") {
                  // Add item to inventory
                  const inventory = ((await sched.getCheckpoint("global-state", "inventory")) ||
                    { ore: 0, energy: 0, items: [] }) as Record<string, any>;
                  if (!inventory.items) inventory.items = [];
                  inventory.items.push({ type: itemType, quality: "rare" });
                  await sched.checkpoint("global-state", "inventory", inventory);
                  await sched.checkpoint(taskId, "item", { type: itemType, quality: "rare" });
                }
              },
            })
          );

          yield* Effect.promise(() => sched.completeTask(taskId));
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

    // Register mine-resource-loop task handler - continuously loops mining resources
    this.scheduler.register(
      "mine-resource-loop",
      (sched: ReliableScheduler, taskId: string, params: unknown) =>
        Effect.gen(function* () {
          const p = params as Record<string, any>;
          const nodeId = (p.nodeId || "copper") as string;
          const yieldAmount = (p.yield || 1) as number;
          const timeMs = (p.timeMs || 4000) as number;

          // Get or initialize cycle counter
          let cycle = ((yield* Effect.promise(() => sched.getCheckpoint(taskId, "cycle"))) || 0) as number;

          // Infinite loop - check if paused/cancelled each iteration
          while (true) {
            // Check if task is paused or cancelled
            const task = yield* Effect.promise(() => sched.getTask(taskId));
            if (!task || task.status === "paused" || task.status === "failed") {
              return;
            }

            // Mining step
            yield* Effect.promise(() =>
              sched.checkpoint(taskId, "step", `mining-${nodeId}`)
            );

            // Wait for mining duration
            yield* Effect.promise(
              () => new Promise<void>((r) => setTimeout(r, timeMs))
            );

            // Check again after wait
            const taskAfterWait = yield* Effect.promise(() => sched.getTask(taskId));
            if (!taskAfterWait || taskAfterWait.status === "paused" || taskAfterWait.status === "failed") {
              return;
            }

            // Deposit resources to global state
            const globalTaskId = `mission4-global-state`;
            let globalTask = yield* Effect.promise(() => sched.getTask(globalTaskId));

            // Recreate global state if missing, completed, or failed
            if (!globalTask || globalTask.status === "completed" || globalTask.status === "failed") {
              const savedResources = globalTask?.progress?.resources;
              if (globalTask) {
                yield* Effect.promise(() => sched.cancelTask(globalTaskId));
                yield* Effect.promise(() => new Promise<void>((r) => setTimeout(r, 100)));
              }
              yield* Effect.promise(() =>
                sched.runNow(globalTaskId, "global-state", { namespace: "mission4" }, { maxRetries: Infinity })
              );
              yield* Effect.promise(() => new Promise<void>((r) => setTimeout(r, 200)));
              globalTask = yield* Effect.promise(() => sched.getTask(globalTaskId));
              // Restore resources if they existed
              if (savedResources !== undefined && globalTask) {
                const resourcesToRestore = typeof savedResources === "number"
                  ? { copper: savedResources }
                  : (savedResources as Record<string, number>);
                yield* Effect.promise(() => sched.checkpoint(globalTaskId, "resources", resourcesToRestore));
              }
            }

            if (globalTask) {
              // Get current resources - handle both object and legacy number format
              const rawResources = yield* Effect.promise(() =>
                sched.getCheckpoint(globalTaskId, "resources")
              );

              // Convert to object format if needed
              let currentResources: Record<string, number>;
              if (rawResources === undefined || rawResources === null) {
                currentResources = { copper: 0 };
              } else if (typeof rawResources === "number") {
                // Legacy format - convert to object
                currentResources = { copper: rawResources };
              } else {
                currentResources = rawResources as Record<string, number>;
              }

              // Add mined resources
              const resourceType = nodeId;
              currentResources[resourceType] = (currentResources[resourceType] || 0) + yieldAmount;
              currentResources.copper = (currentResources.copper || 0) + yieldAmount;

              // Save resources
              yield* Effect.promise(() =>
                sched.checkpoint(globalTaskId, "resources", currentResources)
              );

              // Trigger broadcast to update clients
              yield* Effect.promise(() => doInstance.triggerBroadcast());
            }

            // Increment cycle and save it
            cycle++;
            yield* Effect.promise(() =>
              sched.checkpoint(taskId, "cycle", cycle)
            );

            // Trigger broadcast to update cycle counter
            yield* Effect.promise(() => doInstance.triggerBroadcast());
          }
        })
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

          // Add copper to global state
          const globalTaskId = `mission4-global-state`;
          let globalTask = yield* Effect.promise(() => sched.getTask(globalTaskId));

          // Ensure global state exists
          if (!globalTask || globalTask.status === "completed" || globalTask.status === "failed") {
            const savedResources = globalTask?.progress?.resources;
            if (globalTask) {
              yield* Effect.promise(() => sched.cancelTask(globalTaskId));
              yield* Effect.promise(() => new Promise<void>((r) => setTimeout(r, 100)));
            }
            yield* Effect.promise(() =>
              sched.runNow(globalTaskId, "global-state", { namespace: "mission4" }, { maxRetries: Infinity })
            );
            yield* Effect.promise(() => new Promise<void>((r) => setTimeout(r, 200)));
            globalTask = yield* Effect.promise(() => sched.getTask(globalTaskId));
            if (savedResources !== undefined && globalTask) {
              const resourcesToRestore = typeof savedResources === "number"
                ? { copper: savedResources }
                : (savedResources as Record<string, number>);
              yield* Effect.promise(() => sched.checkpoint(globalTaskId, "resources", resourcesToRestore));
            }
          }

          if (globalTask) {
            // Get current resources
            const rawResources = yield* Effect.promise(() =>
              sched.getCheckpoint(globalTaskId, "resources")
            );

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

            // Save resources
            yield* Effect.promise(() =>
              sched.checkpoint(globalTaskId, "resources", currentResources)
            );

            // Trigger broadcast to update clients
            yield* Effect.promise(() => doInstance.triggerBroadcast());
          }

          yield* Effect.promise(() => sched.completeTask(taskId));
        })
    );

    // Register global-state task handler - keeps state alive forever
    this.scheduler.register(
      "global-state",
      (sched: ReliableScheduler, taskId: string, params: unknown) =>
        Effect.gen(function* () {
          // Initialize resources if needed - handle legacy number format
          const resources = yield* Effect.promise(() => sched.getCheckpoint(taskId, "resources"));
          if (resources === undefined || typeof resources === "number") {
            const initialResources = typeof resources === "number"
              ? { copper: resources }
              : { copper: 0 };
            yield* Effect.promise(() => sched.checkpoint(taskId, "resources", initialResources));
          }

          // Initialize speed multiplier if needed
          const speed = yield* Effect.promise(() => sched.getCheckpoint(taskId, "speedMultiplier"));
          if (speed === undefined) {
            yield* Effect.promise(() => sched.checkpoint(taskId, "speedMultiplier", 1));
          }

          // Keep task running forever
          while (true) {
            yield* Effect.promise(() => new Promise<void>((r) => setTimeout(r, 30000)));
            const task = yield* Effect.promise(() => sched.getTask(taskId));
            if (!task || task.status === "failed") return;
            // Clear completed flag if somehow set
            if (task.progress?.completed === true) {
              yield* Effect.promise(() => sched.checkpoint(taskId, "completed", false));
            }
          }
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

          // Get global state
          const globalTask = yield* Effect.promise(() => sched.getTask(globalTaskId));
          if (!globalTask) {
            yield* Effect.promise(() => sched.completeTask(taskId));
            return;
          }

          // Get current resources and speed
          const currentResources = ((yield* Effect.promise(() =>
            sched.getCheckpoint(globalTaskId, "resources")
          )) || { copper: 0 }) as Record<string, number>;
          const currentSpeed = ((yield* Effect.promise(() =>
            sched.getCheckpoint(globalTaskId, "speedMultiplier")
          )) || 1) as number;

          // Check if can afford
          if ((currentResources.copper || 0) < cost) {
            yield* Effect.promise(() => sched.completeTask(taskId));
            return;
          }

          // Deduct cost and increment speed
          currentResources.copper = (currentResources.copper || 0) - cost;
          yield* Effect.promise(() => sched.checkpoint(globalTaskId, "resources", currentResources));
          yield* Effect.promise(() => sched.checkpoint(globalTaskId, "speedMultiplier", currentSpeed + 1));

          // Broadcast update
          yield* Effect.promise(() => doInstance.triggerBroadcast());

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
    for (const task of tasks) {
      if (
        !this.runningEffects.has(task.taskId) &&
        RESUMABLE_TASKS.includes(task.taskName) &&
        (task.status === "running" || task.status === "failed")
      ) {
        // Recover failed tasks by checkpointing them (checkpoint method now auto-recovers failed tasks)
        if (task.status === "failed") {
          // Use checkpoint to recover - it will automatically set status back to "running"
          await this.scheduler.checkpoint(task.taskId, "_recovered", true);
        }
        this.runningEffects.add(task.taskId);
        this.runTaskHandler(task.taskId, task.taskName, task.params);
      }
    }
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
    for (const ws of sockets) {
      try {
        ws.send(payload);
      } catch (error) {
        console.error("[WS] Error broadcasting:", error);
      }
    }
  }

  // Helper to trigger broadcast from within task handlers
  async triggerBroadcast() {
    const tasks = await this.scheduler.getTasks();
    this.broadcast({
      type: "tasks",
      data: tasks.map((t) => this.formatTaskForUI(t)),
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
        let globalTask = await this.scheduler.getTask(globalTaskId);

        // Recreate global state if completed or failed, preserving resources
        if (globalTask && (globalTask.status === "completed" || globalTask.status === "failed")) {
          const oldResources = ((await this.scheduler.getCheckpoint(globalTaskId, "resources")) || { copper: 0 }) as Record<string, number>;
          await this.scheduler.cancelTask(globalTaskId);
          await this.scheduler.runNow(globalTaskId, "global-state", { namespace }, { maxRetries: Infinity });
          await new Promise((r) => setTimeout(r, 100));
          await this.scheduler.checkpoint(globalTaskId, "resources", oldResources);
          globalTask = await this.scheduler.getTask(globalTaskId);
        }

        if (!globalTask) {
          await this.scheduler.runNow(globalTaskId, "global-state", { namespace }, { maxRetries: Infinity });
          await new Promise((r) => setTimeout(r, 100));
          globalTask = await this.scheduler.getTask(globalTaskId);
        }

        if (globalTask) {
          const currentResources = ((await this.scheduler.getCheckpoint(globalTaskId, "resources")) || {}) as Record<string, number>;
          const currentCopper = currentResources.copper || 0;

          if (currentCopper < params.cost) {
            return c.json({ error: `Insufficient resources. Need ${params.cost} Copper, have ${currentCopper}` }, 400);
          }

          // Deduct cost
          currentResources.copper = currentCopper - params.cost;
          await this.scheduler.checkpoint(globalTaskId, "resources", currentResources);
        }
      }

      // Infinite loop tasks get unlimited retries
      const isInfiniteLoop = params.taskName === "mine-resource-loop";
      await this.scheduler.runNow(
        taskId,
        params.taskName || "agent-loop",
        params,
        isInfiniteLoop ? { maxRetries: Infinity } : undefined
      );

      // Broadcast update
      const tasks = await this.scheduler.getTasks();
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

      const task = await this.scheduler.getTask(taskId);
      if (!task) {
        return c.json({ error: "Task not found" }, 404);
      }

      return c.json(this.formatTaskForUI(task));
    });

    // Get all tasks (optionally filtered by namespace)
    this.app.get("/tasks", async (c) => {
      const namespace = c.req.query("namespace");
      const tasks = await this.scheduler.getTasks();
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

      const paused = await this.scheduler.pauseTask(taskId);
      if (!paused) {
        return c.json({ error: "Task not found or cannot be paused" }, 404);
      }

      const tasks = await this.scheduler.getTasks();
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

      const resumed = await this.scheduler.resumeTask(taskId);
      if (!resumed) {
        return c.json({ error: "Task not found or not paused" }, 404);
      }

      const tasks = await this.scheduler.getTasks();
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

      const cancelled = await this.scheduler.cancelTask(taskId);
      if (!cancelled) {
        return c.json({ error: "Task not found" }, 404);
      }

      const tasks = await this.scheduler.getTasks();
      this.broadcast({
        type: "tasks",
        data: tasks.map((t) => this.formatTaskForUI(t)),
      });

      return c.json({ taskId, status: "cancelled" });
    });

    // Clear completed tasks
    this.app.post("/tasks/clear", async (c) => {
      const count = await this.scheduler.clearCompleted();

      const tasks = await this.scheduler.getTasks();
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

      const tasks = await this.scheduler.getTasks();
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

      // Send initial state
      const tasks = await this.scheduler.getTasks();
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
    await this.scheduler.alarm();
    // Broadcast after alarm processing
    const tasks = await this.scheduler.getTasks();
    this.broadcast({
      type: "tasks",
      data: tasks.map((t) => this.formatTaskForUI(t)),
    });
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
  const id = env.TASK_SCHEDULER_DO.idFromName("scheduler");
  const doInstance = env.TASK_SCHEDULER_DO.get(id);
  return await doInstance.fetch(c.req.raw);
});

workerApp.on(["GET", "POST"], "/tasks*", async (c) => {
  const env = c.env as Env;
  const id = env.TASK_SCHEDULER_DO.idFromName("scheduler");
  const doInstance = env.TASK_SCHEDULER_DO.get(id);
  return await doInstance.fetch(c.req.raw);
});

workerApp.get("/ws", async (c) => {
  const env = c.env as Env;
  const id = env.TASK_SCHEDULER_DO.idFromName("scheduler");
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
