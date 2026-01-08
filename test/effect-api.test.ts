import { env, runInDurableObject } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { Effect } from "effect";
import { ReliableScheduler, HandlerMissing, TaskNotFound } from "../src/index";

describe("Effect API (Story 004)", () => {
  const getScheduler = () => {
    const id = env.SCHEDULER_DO.idFromName(`effect-test-${Date.now()}-${Math.random()}`);
    return env.SCHEDULER_DO.get(id);
  };



  describe("schedule returns Effect type", () => {
    it("schedule() returns Effect.Effect<void, HandlerMissing>", async () => {
      const stub = getScheduler();
      const futureTime = Date.now() + 60000;

      await runInDurableObject(stub, async (instance) => {
        instance.scheduler.register("test-task", (taskId, params) => Effect.succeed(void 0));

        // schedule should return an Effect, not a Promise
        const result = instance.scheduler.schedule(futureTime, "task-1", "test-task", { foo: "bar" });

        expect(result).toBeInstanceOf(Effect);

        // Running the Effect should create the task
        await Effect.runPromise(result);

        const task = await Effect.runPromise(instance.scheduler.getTask("task-1"));
        expect(task).toBeDefined();
        expect(task?.taskId).toBe("task-1");
        expect(task?.taskName).toBe("test-task");
        expect(task?.params).toEqual({ foo: "bar" });
        expect(task?.status).toBe("pending");
      });
    });

    it("schedule() raises HandlerMissing for unregistered task", async () => {
      const stub = getScheduler();
      const futureTime = Date.now() + 60000;

      await runInDurableObject(stub, async (instance) => {
        const result = instance.scheduler.schedule(futureTime, "task-1", "non-existent-task");

        // Should be an Effect
        expect(result).toBeInstanceOf(Effect);
        await expect(Effect.runPromise(result)).rejects.toThrowError(HandlerMissing);
      });
    });

    it("schedule() error contains taskName field", async () => {
      const stub = getScheduler();
      const futureTime = Date.now() + 60000;

      const result = stub.schedule(futureTime, "task-1", "unknown-task");
      
      try {
        await Effect.runPromise(result);
        expect(false).toBe(true); // Should have thrown
      } catch (e) {
        expect(e).toBeInstanceOf(HandlerMissing);
        expect((e as HandlerMissing).taskName).toBe("unknown-task");
      }
    });
  });

  describe("runNow returns Effect type", () => {
    it("runNow() returns Effect.Effect<void, HandlerMissing>", async () => {
      const stub = getScheduler();

      const result = stub.runNow("task-1", "test-task", { foo: "bar" });

      expect(result).toBeInstanceOf(Effect);
      
      await Effect.runPromise(result);

      const task = await stub.getTask("task-1");
      expect(task).toBeDefined();
      expect(task?.taskName).toBe("test-task");
      expect(task?.status).toBe("running");
    });

    it("runNow() raises HandlerMissing for unregistered task", async () => {
      const stub = getScheduler();

      const result = stub.runNow("task-1", "non-existent-task");

      expect(result).toBeInstanceOf(Effect);
      await expect(Effect.runPromise(result)).rejects.toThrowError(HandlerMissing);
    });
  });

  describe("checkpoint returns Effect type", () => {
    it("checkpoint() returns Effect.Effect<void, never, SchedulerService>", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task");

      const result = stub.checkpoint("task-1", "step", "step-1");

      expect(result).toBeInstanceOf(Effect);
      
      await Effect.runPromise(result);

      const value = await stub.getCheckpoint("task-1", "step");
      expect(value).toBe("step-1");
    });
  });

  describe("getTask returns Effect type", () => {
    it("getTask() returns Effect.Effect<Task | undefined>", async () => {
      const stub = getScheduler();
      await stub.schedule(Date.now() + 60000, "task-1", "test-task");

      const result = stub.getTask("task-1");

      expect(result).toBeInstanceOf(Effect);
      
      const task = await Effect.runPromise(result);
      expect(task).toBeDefined();
      expect(task?.taskId).toBe("task-1");
    });

    it("getTask() returns undefined for non-existent task", async () => {
      const stub = getScheduler();

      const result = stub.getTask("non-existent");

      expect(result).toBeInstanceOf(Effect);
      
      const task = await Effect.runPromise(result);
      expect(task).toBeUndefined();
    });
  });

  describe("getTasks returns Effect type", () => {
    it("getTasks() returns Effect.Effect<Task[]>", async () => {
      const stub = getScheduler();
      await stub.schedule(Date.now() + 60000, "task-1", "test-task");
      await stub.schedule(Date.now() + 60000, "task-2", "test-task");

      const result = stub.getTasks();

      expect(result).toBeInstanceOf(Effect);
      
      const tasks = await Effect.runPromise(result);
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBe(2);
    });

    it("getTasks(status) filters correctly", async () => {
      const stub = getScheduler();
      await stub.schedule(Date.now() + 60000, "task-1", "test-task");
      await stub.schedule(Date.now() + 60000, "task-2", "test-task");
      await stub.pauseTask("task-2");

      const result = stub.getTasks("pending");

      expect(result).toBeInstanceOf(Effect);
      
      const tasks = await Effect.runPromise(result);
      expect(tasks.length).toBe(1);
      expect(tasks[0]?.taskId).toBe("task-1");
    });
  });

  describe("completeTask returns Effect type", () => {
    it("completeTask() returns Effect.Effect<void>", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task");

      const result = stub.completeTask("task-1");

      expect(result).toBeInstanceOf(Effect);
      
      await Effect.runPromise(result);

      const task = await stub.getTask("task-1");
      expect(task?.status).toBe("completed");
    });
  });

  describe("cancelTask returns Effect type", () => {
    it("cancelTask() returns Effect.Effect<boolean>", async () => {
      const stub = getScheduler();
      await stub.schedule(Date.now() + 60000, "task-1", "test-task");

      const result = stub.cancelTask("task-1");

      expect(result).toBeInstanceOf(Effect);
      
      const cancelled = await Effect.runPromise(result);
      expect(cancelled).toBe(true);

      const task = await stub.getTask("task-1");
      expect(task).toBeUndefined();
    });

    it("cancelTask() returns false for non-existent task", async () => {
      const stub = getScheduler();

      const result = stub.cancelTask("non-existent");

      expect(result).toBeInstanceOf(Effect);
      
      const cancelled = await Effect.runPromise(result);
      expect(cancelled).toBe(false);
    });
  });

  describe("pauseTask returns Effect type", () => {
    it("pauseTask() returns Effect.Effect<boolean>", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task");

      const result = stub.pauseTask("task-1");

      expect(result).toBeInstanceOf(Effect);
      
      const paused = await Effect.runPromise(result);
      expect(paused).toBe(true);

      const task = await stub.getTask("task-1");
      expect(task?.status).toBe("paused");
    });
  });

  describe("resumeTask returns Effect type", () => {
    it("resumeTask() returns Effect.Effect<boolean>", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task");
      await stub.pauseTask("task-1");

      const result = stub.resumeTask("task-1");

      expect(result).toBeInstanceOf(Effect);
      
      const resumed = await Effect.runPromise(result);
      expect(resumed).toBe(true);

      const task = await stub.getTask("task-1");
      expect(task?.status).toBe("running");
    });
  });

  describe("clearCompleted returns Effect type", () => {
    it("clearCompleted() returns Effect.Effect<number>", async () => {
      const stub = getScheduler();
      await stub.schedule(Date.now() + 60000, "task-1", "test-task");
      await stub.schedule(Date.now() + 60000, "task-2", "test-task");
      await stub.completeTask("task-1");

      const result = stub.clearCompleted();

      expect(result).toBeInstanceOf(Effect);
      
      const count = await Effect.runPromise(result);
      expect(count).toBe(1);
    });
  });

  describe("recoverStuckTasks returns Effect type", () => {
    it("recoverStuckTasks() returns Effect.Effect<number>", async () => {
      const stub = getScheduler();

      const result = stub.recoverStuckTasks();

      expect(result).toBeInstanceOf(Effect);
      
      const recovered = await Effect.runPromise(result);
      expect(typeof recovered).toBe("number");
    });
  });

  describe("alarm returns Effect type", () => {
    it("alarm() returns Effect.Effect<void>", async () => {
      const stub = getScheduler();
      // Schedule a task in the past so alarm has something to process
      await stub.schedule(Date.now() - 1000, "task-1", "test-task");

      const result = stub.alarm();

      expect(result).toBeInstanceOf(Effect);
      
      await Effect.runPromise(result);
    });
  });

  describe("runSteps returns Effect type", () => {
    it("runSteps() returns Effect.Effect<void>", async () => {
      const stub = getScheduler();

      const result = stub.runSteps("task-1", ["step-1", "step-2"], {
        stepDuration: 100,
        autoComplete: false,
      });

      expect(result).toBeInstanceOf(Effect);
      
      await Effect.runPromise(result);

      const task = await stub.getTask("task-1");
      expect(task?.progress?.step).toBe("step-2");
      expect(task?.progress?.completedSteps).toEqual(["step-1", "step-2"]);
    });
  });

  describe("getCheckpoint returns Effect type", () => {
    it("getCheckpoint() returns Effect.Effect<unknown>", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task");
      await stub.checkpoint("task-1", "key", "value");

      const result = stub.getCheckpoint("task-1", "key");

      expect(result).toBeInstanceOf(Effect);
      
      const value = await Effect.runPromise(result);
      expect(value).toBe("value");
    });
  });

  describe("checkpointMultiple returns Effect type", () => {
    it("checkpointMultiple() returns Effect.Effect<void>", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task");

      const result = stub.checkpointMultiple("task-1", {
        step: "step-1",
        progress: 50,
      });

      expect(result).toBeInstanceOf(Effect);
      
      await Effect.runPromise(result);

      expect(await stub.getCheckpoint("task-1", "step")).toBe("step-1");
      expect(await stub.getCheckpoint("task-1", "progress")).toBe(50);
    });
  });
});
