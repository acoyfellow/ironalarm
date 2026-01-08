import { env, runInDurableObject } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";

describe("ReliableScheduler Core API", () => {
  // Get a fresh DO instance for each test
  const getScheduler = () => {
    const id = env.SCHEDULER_DO.idFromName(`test-${Date.now()}-${Math.random()}`);
    return env.SCHEDULER_DO.get(id);
  };

  describe("runNow", () => {
    it("creates a task that starts running", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task", { foo: "bar" });

      const task = await stub.getTask("task-1");
      expect(task).toBeDefined();
      expect(task?.taskId).toBe("task-1");
      expect(task?.taskName).toBe("test-task");
      expect(task?.params).toEqual({ foo: "bar" });
      // Task starts running but may complete quickly
      expect(["running", "completed"]).toContain(task?.status);
    });

    it("sets default priority to 1", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task");

      const task = await stub.getTask("task-1");
      expect(task?.priority).toBe(1);
    });

    it("accepts custom priority", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task", {}, { priority: 0 });

      const task = await stub.getTask("task-1");
      expect(task?.priority).toBe(0);
    });

    it("sets safetyAlarmAt for eviction recovery", async () => {
      const stub = getScheduler();
      const before = Date.now();
      await stub.runNow("task-1", "test-task");

      const task = await stub.getTask("task-1");
      expect(task?.safetyAlarmAt).toBeDefined();
      expect(task?.safetyAlarmAt).toBeGreaterThan(before);
      // Safety alarm should be ~30s in future
      expect(task?.safetyAlarmAt! - before).toBeGreaterThanOrEqual(29000);
      expect(task?.safetyAlarmAt! - before).toBeLessThanOrEqual(31000);
    });

    it("accepts maxRetries option", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task", {}, { maxRetries: 5 });

      const task = await stub.getTask("task-1");
      expect(task?.maxRetries).toBe(5);
    });
  });

  describe("schedule", () => {
    it("creates a task with pending status", async () => {
      const stub = getScheduler();
      const futureTime = Date.now() + 60000;
      await stub.schedule(futureTime, "task-1", "test-task", { foo: "bar" });

      const task = await stub.getTask("task-1");
      expect(task).toBeDefined();
      expect(task?.status).toBe("pending");
      expect(task?.scheduledAt).toBe(futureTime);
    });

    it("sets default priority to 1", async () => {
      const stub = getScheduler();
      await stub.schedule(Date.now() + 60000, "task-1", "test-task");

      const task = await stub.getTask("task-1");
      expect(task?.priority).toBe(1);
    });

    it("accepts custom priority", async () => {
      const stub = getScheduler();
      await stub.schedule(Date.now() + 60000, "task-1", "test-task", {}, { priority: 2 });

      const task = await stub.getTask("task-1");
      expect(task?.priority).toBe(2);
    });

    it("executes immediately if scheduled in past", async () => {
      const stub = getScheduler();
      await stub.schedule(Date.now() - 1000, "task-1", "test-task");

      // Give it a moment to execute
      await new Promise(r => setTimeout(r, 100));

      const task = await stub.getTask("task-1");
      // Task should have started running or completed
      expect(["running", "completed"]).toContain(task?.status);
    });
  });

  describe("checkpoint", () => {
    it("saves progress on a task", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task");
      await stub.checkpoint("task-1", "step", "step-1");

      const value = await stub.getCheckpoint("task-1", "step");
      expect(value).toBe("step-1");
    });

    it("overwrites existing checkpoint", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task");
      await stub.checkpoint("task-1", "step", "step-1");
      await stub.checkpoint("task-1", "step", "step-2");

      const value = await stub.getCheckpoint("task-1", "step");
      expect(value).toBe("step-2");
    });

    it("stores complex objects", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task");
      await stub.checkpoint("task-1", "data", { nested: { value: 42 }, array: [1, 2, 3] });

      const value = await stub.getCheckpoint("task-1", "data");
      expect(value).toEqual({ nested: { value: 42 }, array: [1, 2, 3] });
    });
  });

  describe("checkpointMultiple", () => {
    it("saves multiple checkpoints atomically", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task");
      await stub.checkpointMultiple("task-1", {
        step: "step-1",
        progress: 50,
        data: { foo: "bar" }
      });

      expect(await stub.getCheckpoint("task-1", "step")).toBe("step-1");
      expect(await stub.getCheckpoint("task-1", "progress")).toBe(50);
      expect(await stub.getCheckpoint("task-1", "data")).toEqual({ foo: "bar" });
    });
  });

  describe("getTask", () => {
    it("returns undefined for non-existent task", async () => {
      const stub = getScheduler();
      const task = await stub.getTask("non-existent");
      expect(task).toBeUndefined();
    });

    it("returns task with all fields", async () => {
      const stub = getScheduler();
      // Schedule in future so it doesn't auto-execute
      await stub.schedule(Date.now() + 60000, "task-1", "long-task", { param: "value" }, { priority: 0 });

      const task = await stub.getTask("task-1");
      expect(task).toMatchObject({
        taskId: "task-1",
        taskName: "long-task",
        params: { param: "value" },
        priority: 0,
        status: "pending",
      });
      expect(task?.startedAt).toBeDefined();
      expect(task?.scheduledAt).toBeDefined();
      expect(task?.progress).toBeDefined();
    });
  });

  describe("getTasks", () => {
    it("returns all tasks when no filter", async () => {
      const stub = getScheduler();
      // Schedule both in future
      await stub.schedule(Date.now() + 60000, "task-1", "long-task");
      await stub.schedule(Date.now() + 60000, "task-2", "long-task");

      const tasks = await stub.getTasks();
      expect(tasks.length).toBe(2);
    });

    it("filters by status", async () => {
      const stub = getScheduler();
      // Create pending task scheduled in future
      await stub.schedule(Date.now() + 60000, "task-1", "long-task");
      // Create another pending task and pause it
      await stub.schedule(Date.now() + 60000, "task-2", "long-task");
      await stub.pauseTask("task-2");

      const pending = await stub.getTasks("pending");
      expect(pending.length).toBe(1);
      expect(pending[0]?.taskId).toBe("task-1");

      const paused = await stub.getTasks("paused");
      expect(paused.length).toBe(1);
      expect(paused[0]?.taskId).toBe("task-2");
    });
  });

  describe("generateTaskId", () => {
    it("generates IDs with timestamp", async () => {
      const stub = getScheduler();

      await runInDurableObject(stub, async (instance) => {
        const id = (instance.constructor as any).generateTaskId();
        expect(id).toMatch(/^task-\d+$/);
      });
    });

    it("uses custom prefix", async () => {
      const stub = getScheduler();

      await runInDurableObject(stub, async (instance) => {
        const id = (instance.constructor as any).generateTaskId("custom");
        expect(id).toMatch(/^custom-\d+$/);
      });
    });
  });

  describe("getCachedTasks", () => {
    it("returns cached data after getTasks() call", async () => {
      const stub = getScheduler();
      
      await stub.schedule(Date.now() + 60000, "cache-test-1", "test-task");
      await stub.schedule(Date.now() + 60000, "cache-test-2", "test-task");
      
      await runInDurableObject(stub, async (instance) => {
        // Load cache
        await instance.scheduler.getTasks();
        
        // Should return cached tasks
        const cached = (instance.scheduler as any).getCachedTasks();
        expect(cached.length).toBe(2);
        expect(cached.some((t: any) => t.taskId === "cache-test-1")).toBe(true);
        expect(cached.some((t: any) => t.taskId === "cache-test-2")).toBe(true);
        
        // Filter by status
        const pending = (instance.scheduler as any).getCachedTasks("pending");
        expect(pending.length).toBe(2);
      });
    });
  });
});
