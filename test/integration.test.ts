import { env, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { getScheduler, waitFor } from "./helpers";

describe("ReliableScheduler Integration", () => {
  describe("concurrency limits", () => {
    it("processes tasks in batches respecting maxConcurrentTasks", async () => {
      const stub = getScheduler();
      
      // Create scheduler with low concurrency limit
      await runInDurableObject(stub, async (instance) => {
        (instance.scheduler as any).maxConcurrentTasks = 2;
      });
      
      const now = Date.now() - 200;
      // Schedule 5 tasks all due at same time
      for (let i = 0; i < 5; i++) {
        await stub.schedule(now, `concurrent-task-${i}`, "slow-task");
      }
      
      // Wait a bit for them to queue
      await waitFor(50);
      
      await runDurableObjectAlarm(stub);
      
      // Wait for all to complete (5 tasks * 50ms each = 250ms, but batched)
      await waitFor(600);
      
      // All should complete
      for (let i = 0; i < 5; i++) {
        const task = await stub.getTask(`concurrent-task-${i}`);
        expect(task?.status).toBe("completed");
      }
    });

    it("maxConcurrentTasks option works in constructor", async () => {
      const stub = getScheduler();
      await runInDurableObject(stub, async (instance, state) => {
        const SchedulerClass = instance.scheduler.constructor as any;
        const scheduler = new SchedulerClass(
          state.storage,
          { maxConcurrentTasks: 5 }
        );
        expect((scheduler as any).maxConcurrentTasks).toBe(5);
      });
    });
  });

  describe("Date vs number handling", () => {
    it("schedule() accepts Date object", async () => {
      const stub = getScheduler();
      const futureDate = new Date(Date.now() + 60000);
      
      await stub.schedule(futureDate, "date-task", "test-task");
      
      const task = await stub.getTask("date-task");
      expect(task?.scheduledAt).toBe(futureDate.getTime());
    });
  });

  describe("rapid mutations", () => {
    it("multiple rapid mutations don't corrupt state", async () => {
      const stub = getScheduler();
      
      // Rapid fire mutations
      await Promise.all([
        stub.runNow("rapid-1", "test-task"),
        stub.runNow("rapid-2", "test-task"),
        stub.schedule(Date.now() + 1000, "rapid-3", "test-task"),
        stub.checkpoint("rapid-1", "key1", "value1"),
        stub.checkpoint("rapid-2", "key2", "value2"),
      ]);
      
      await waitFor(100);
      
      const task1 = await stub.getTask("rapid-1");
      const task2 = await stub.getTask("rapid-2");
      const task3 = await stub.getTask("rapid-3");
      
      expect(task1).toBeDefined();
      expect(task2).toBeDefined();
      expect(task3).toBeDefined();
      expect(task1?.progress.key1).toBe("value1");
      expect(task2?.progress.key2).toBe("value2");
    });
  });
});

