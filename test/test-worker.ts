import { DurableObject } from "cloudflare:workers";
import { ReliableScheduler, type Task, type TaskStatus } from "../src/index";
import { Effect } from "effect";

type Env = {
  SCHEDULER_DO: DurableObjectNamespace<TestSchedulerDO>;
};

/**
 * Minimal test Durable Object that wraps ReliableScheduler
 * Exposes all scheduler methods for testing
 */
export class TestSchedulerDO extends DurableObject {
  scheduler: ReliableScheduler;
  handlerCallOrder: string[] = [];

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.scheduler = new ReliableScheduler(ctx.storage);

    // Register test handlers
    this.scheduler.register("test-task", (sched, taskId, params) =>
      Effect.gen(function* () {
        yield* Effect.promise(() => sched.checkpoint(taskId, "executed", true));
        yield* Effect.promise(() => sched.completeTask(taskId));
      })
    );

    // Handler that tracks execution order (for priority tests)
    // Use closure to capture `this` reference
    const self = this;
    this.scheduler.register("order-tracker", (sched, taskId, params) =>
      Effect.gen(function* () {
        self.handlerCallOrder.push(taskId);
        yield* Effect.promise(() => sched.checkpoint(taskId, "executed", true));
        yield* Effect.promise(() => sched.completeTask(taskId));
      })
    );

    // Long-running handler (for pause/resume tests)
    this.scheduler.register("long-task", (sched, taskId, params) =>
      Effect.gen(function* () {
        const p = params as { steps?: number };
        const steps = p.steps || 3;

        for (let i = 0; i < steps; i++) {
          const task = yield* Effect.promise(() => sched.getTask(taskId));
          if (!task || task.status === "paused") return;

          yield* Effect.promise(() => sched.checkpoint(taskId, `step-${i}`, true));
          yield* Effect.promise(() => sched.checkpoint(taskId, "currentStep", i));
        }

        yield* Effect.promise(() => sched.completeTask(taskId));
      })
    );

    // Infinite loop handler (for recovery tests)
    this.scheduler.register("loop-task", (sched, taskId, params) =>
      Effect.gen(function* () {
        const task = yield* Effect.promise(() => sched.getTask(taskId));
        if (!task || task.status === "paused" || task.status === "failed") return;

        const count = ((yield* Effect.promise(() => sched.getCheckpoint(taskId, "count"))) as number) || 0;
        yield* Effect.promise(() => sched.checkpoint(taskId, "count", count + 1));

        // Reschedule
        const nextTime = Date.now() + 1000;
        yield* Effect.promise(() => sched.schedule(nextTime, taskId, "loop-task", params));
      })
    );

    // Error-throwing handler (for error handling tests)
    this.scheduler.register("error-task", (sched, taskId, params) =>
      Effect.gen(function* () {
        throw new Error("Handler error");
      })
    );

    // Step-based handler (for runSteps tests)
    this.scheduler.register("step-task", (sched, taskId, params) =>
      Effect.gen(function* () {
        const steps = (params as { steps?: string[] })?.steps || ["step1", "step2", "step3"];
        yield* Effect.promise(() => sched.runSteps(taskId, steps, {
          stepDuration: 10,
          autoComplete: true
        }));
      })
    );

    // Slow handler (for concurrency tests)
    this.scheduler.register("slow-task", (sched, taskId, params) =>
      Effect.gen(function* () {
        yield* Effect.promise(() => new Promise(r => setTimeout(r, 50)));
        yield* Effect.promise(() => sched.checkpoint(taskId, "executed", true));
        yield* Effect.promise(() => sched.completeTask(taskId));
      })
    );
  }

  async alarm() {
    await this.scheduler.alarm();
  }

  // Expose scheduler methods for testing
  async runNow(taskId: string, taskName: string, params?: unknown, options?: { maxRetries?: number; priority?: number }) {
    return this.scheduler.runNow(taskId, taskName, params, options);
  }

  async schedule(at: number, taskId: string, taskName: string, params?: unknown, options?: { priority?: number }) {
    return this.scheduler.schedule(at, taskId, taskName, params, options);
  }

  async checkpoint(taskId: string, key: string, value: unknown) {
    return this.scheduler.checkpoint(taskId, key, value);
  }

  async getCheckpoint(taskId: string, key: string) {
    return this.scheduler.getCheckpoint(taskId, key);
  }

  async checkpointMultiple(taskId: string, updates: Record<string, unknown>) {
    return this.scheduler.checkpointMultiple(taskId, updates);
  }

  async completeTask(taskId: string) {
    return this.scheduler.completeTask(taskId);
  }

  async getTask(taskId: string) {
    return this.scheduler.getTask(taskId);
  }

  async getTasks(status?: TaskStatus) {
    return this.scheduler.getTasks(status);
  }

  async cancelTask(taskId: string) {
    return this.scheduler.cancelTask(taskId);
  }

  async pauseTask(taskId: string) {
    return this.scheduler.pauseTask(taskId);
  }

  async resumeTask(taskId: string) {
    return this.scheduler.resumeTask(taskId);
  }

  async clearCompleted() {
    return this.scheduler.clearCompleted();
  }

  async clearAll() {
    return this.scheduler.clearAll();
  }

  async recoverStuckTasks(taskNames?: string[]) {
    return this.scheduler.recoverStuckTasks(taskNames);
  }

  async runSteps(taskId: string, steps: string[], options?: any) {
    return this.scheduler.runSteps(taskId, steps, options);
  }

  async runSubSteps(taskId: string, stepName: string, stepIndex: number, totalSteps: number, subStepCount: number, subStepDuration: number, onSubStep?: (i: number) => Promise<void>) {
    return this.scheduler.runSubSteps(taskId, stepName, stepIndex, totalSteps, subStepCount, subStepDuration, onSubStep);
  }

  // Test helpers
  getHandlerCallOrder() {
    return this.handlerCallOrder;
  }

  clearHandlerCallOrder() {
    this.handlerCallOrder = [];
  }

  // Static method wrapper
  static generateTaskId(prefix?: string) {
    return ReliableScheduler.generateTaskId(prefix);
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return new Response("Test worker");
  },
};
