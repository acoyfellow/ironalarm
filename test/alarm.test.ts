import { env, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("ReliableScheduler Alarm Processing", () => {
  const getScheduler = () => {
    const id = env.SCHEDULER_DO.idFromName(`test-${Date.now()}-${Math.random()}`);
    return env.SCHEDULER_DO.get(id);
  };

  describe("alarm()", () => {
    it("processes due tasks", async () => {
      const stub = getScheduler();
      const now = Date.now();

      await stub.schedule(now - 1000, "task-1", "test-task");
      await stub.schedule(now - 500, "task-2", "test-task");

      await runDurableObjectAlarm(stub);

      // Give handlers time to complete
      await new Promise(r => setTimeout(r, 100));

      const task1 = await stub.getTask("task-1");
      const task2 = await stub.getTask("task-2");

      expect(task1?.status).toBe("completed");
      expect(task2?.status).toBe("completed");
    });

    it("does not process future tasks", async () => {
      const stub = getScheduler();

      await stub.schedule(Date.now() + 60000, "future-task", "test-task");

      await runDurableObjectAlarm(stub);

      const task = await stub.getTask("future-task");
      expect(task?.status).toBe("pending");
    });

    it("skips paused tasks", async () => {
      const stub = getScheduler();

      // Schedule in future first, then pause, then wait for due time
      const dueTime = Date.now() + 100;
      await stub.schedule(dueTime, "paused-task", "test-task");
      await stub.pauseTask("paused-task");

      // Wait for due time
      await new Promise(r => setTimeout(r, 150));

      await runDurableObjectAlarm(stub);

      const task = await stub.getTask("paused-task");
      expect(task?.status).toBe("paused");
    });

    it("executes handler and marks completed", async () => {
      const stub = getScheduler();

      await stub.schedule(Date.now() - 100, "task-1", "test-task");
      await runDurableObjectAlarm(stub);

      // Give handler time to complete
      await new Promise(r => setTimeout(r, 100));

      const task = await stub.getTask("task-1");
      expect(task?.status).toBe("completed");
      expect(task?.progress.executed).toBe(true);
    });
  });

  describe("eviction recovery (safety alarm)", () => {
    it("retries task when safety alarm fires", async () => {
      const stub = getScheduler();

      // Start a task - this sets safetyAlarmAt
      await stub.runNow("task-1", "test-task");

      // Simulate eviction by not waiting for completion
      // and triggering alarm (which would fire if evicted)
      await runDurableObjectAlarm(stub);

      // Give handler time to complete
      await new Promise(r => setTimeout(r, 100));

      const task = await stub.getTask("task-1");
      expect(task?.status).toBe("completed");
    });

    it("increments retryCount on retry", async () => {
      const stub = getScheduler();

      // Create a task that looks like it was interrupted
      await runInDurableObject(stub, async (instance, state) => {
        const now = Date.now();
        await state.storage.put("task:stuck-task", {
          taskId: "stuck-task",
          taskName: "test-task",
          params: {},
          scheduledAt: now - 5000,
          startedAt: now - 5000,
          status: "running",
          safetyAlarmAt: now - 1000, // Safety alarm in past = should retry
          progress: {},
          retryCount: 0,
          priority: 1,
        });
      });

      await runDurableObjectAlarm(stub);
      await new Promise(r => setTimeout(r, 100));

      const task = await stub.getTask("stuck-task");
      // Should have completed via retry
      expect(task?.status).toBe("completed");
    });

    it("fails task after max retries", async () => {
      const stub = getScheduler();

      // Create a task that has exceeded max retries
      await runInDurableObject(stub, async (instance, state) => {
        const now = Date.now();
        await state.storage.put("task:max-retry-task", {
          taskId: "max-retry-task",
          taskName: "test-task",
          params: {},
          scheduledAt: now - 5000,
          startedAt: now - 5000,
          status: "running",
          safetyAlarmAt: now - 1000,
          progress: {},
          retryCount: 3, // Already at max (default is 3)
          maxRetries: 3,
          priority: 1,
        });
      });

      await runDurableObjectAlarm(stub);

      const task = await stub.getTask("max-retry-task");
      expect(task?.status).toBe("failed");
      expect(task?.progress.error).toContain("max retries");
    });
  });

  describe("recoverStuckTasks()", () => {
    it("recovers tasks scheduled in the past", async () => {
      const stub = getScheduler();

      // Create a stuck task
      await runInDurableObject(stub, async (instance, state) => {
        const now = Date.now();
        await state.storage.put("task:stuck-task", {
          taskId: "stuck-task",
          taskName: "loop-task",
          params: {},
          scheduledAt: now - 10000, // 10 seconds ago
          startedAt: now - 10000,
          status: "running",
          progress: {},
          priority: 1,
        });
      });

      const recovered = await stub.recoverStuckTasks(["loop-task"]);
      expect(recovered).toBe(1);

      // Task should be rescheduled - verify immediately to avoid cleanup issues
      const task = await stub.getTask("stuck-task");
      expect(task?.scheduledAt).toBeGreaterThan(Date.now() - 1000);
      
      // Clean up the task to avoid storage cleanup issues
      await stub.cancelTask("stuck-task");
    });

    it("recovers failed tasks", async () => {
      const stub = getScheduler();

      await runInDurableObject(stub, async (instance, state) => {
        await state.storage.put("task:failed-task", {
          taskId: "failed-task",
          taskName: "loop-task",
          params: {},
          scheduledAt: Date.now() - 5000,
          startedAt: Date.now() - 5000,
          status: "failed",
          progress: { error: "some error" },
          priority: 1,
        });
      });

      const recovered = await stub.recoverStuckTasks(["loop-task"]);
      expect(recovered).toBe(1);

      const task = await stub.getTask("failed-task");
      expect(task?.progress._recovered).toBe(true);
    });

    it("only recovers specified task names", async () => {
      const stub = getScheduler();

      await runInDurableObject(stub, async (instance, state) => {
        const now = Date.now();
        await state.storage.put("task:loop-task", {
          taskId: "loop-task",
          taskName: "loop-task",
          params: {},
          scheduledAt: now - 10000,
          startedAt: now - 10000,
          status: "running",
          progress: {},
          priority: 1,
        });
        await state.storage.put("task:other-task", {
          taskId: "other-task",
          taskName: "other-task",
          params: {},
          scheduledAt: now - 10000,
          startedAt: now - 10000,
          status: "running",
          progress: {},
          priority: 1,
        });
      });

      // Only recover loop-task
      const recovered = await stub.recoverStuckTasks(["loop-task"]);
      expect(recovered).toBe(1);
    });

    it("does not recover recent tasks", async () => {
      const stub = getScheduler();

      // Create a task that was just scheduled (not stuck)
      await stub.schedule(Date.now() - 100, "recent-task", "loop-task");

      const recovered = await stub.recoverStuckTasks(["loop-task"]);
      // Task scheduled 100ms ago is not considered stuck (threshold is 5s)
      expect(recovered).toBe(0);
    });
  });
});
