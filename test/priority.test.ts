import { env, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("ReliableScheduler Priority", () => {
  const getScheduler = () => {
    const id = env.SCHEDULER_DO.idFromName(`test-${Date.now()}-${Math.random()}`);
    return env.SCHEDULER_DO.get(id);
  };

  describe("priority field", () => {
    it("defaults to 1 (medium) for runNow", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task");

      const task = await stub.getTask("task-1");
      expect(task?.priority).toBe(1);
    });

    it("defaults to 1 (medium) for schedule", async () => {
      const stub = getScheduler();
      await stub.schedule(Date.now() + 60000, "task-1", "test-task");

      const task = await stub.getTask("task-1");
      expect(task?.priority).toBe(1);
    });

    it("accepts priority 0 (high)", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task", {}, { priority: 0 });

      const task = await stub.getTask("task-1");
      expect(task?.priority).toBe(0);
    });

    it("accepts priority 2 (low)", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task", {}, { priority: 2 });

      const task = await stub.getTask("task-1");
      expect(task?.priority).toBe(2);
    });

    it("preserves priority on reschedule", async () => {
      const stub = getScheduler();
      await stub.schedule(Date.now() + 1000, "task-1", "test-task", {}, { priority: 0 });

      // Reschedule same task
      await stub.schedule(Date.now() + 2000, "task-1", "test-task", {});

      const task = await stub.getTask("task-1");
      // Priority should be preserved from original
      expect(task?.priority).toBe(0);
    });

    it("can override priority on reschedule", async () => {
      const stub = getScheduler();
      await stub.schedule(Date.now() + 1000, "task-1", "test-task", {}, { priority: 0 });

      // Reschedule with new priority
      await stub.schedule(Date.now() + 2000, "task-1", "test-task", {}, { priority: 2 });

      const task = await stub.getTask("task-1");
      expect(task?.priority).toBe(2);
    });
  });

  describe("priority ordering", () => {
    it("processes high priority before medium when due at same time", async () => {
      const stub = getScheduler();
      const dueTime = Date.now() + 100; // Slightly in future so they all queue first

      // Clear any previous call order first
      await runInDurableObject(stub, async (instance) => {
        (instance as any).clearHandlerCallOrder();
      });

      // Schedule tasks with same time but different priorities
      // Add them in reverse priority order to verify sorting works
      await stub.schedule(dueTime, "low-task", "order-tracker", {}, { priority: 2 });
      await stub.schedule(dueTime, "medium-task", "order-tracker", {}, { priority: 1 });
      await stub.schedule(dueTime, "high-task", "order-tracker", {}, { priority: 0 });

      // Wait for the scheduled time to pass
      await new Promise(r => setTimeout(r, 150));

      // Trigger alarm to process all tasks
      await runDurableObjectAlarm(stub);

      // Wait for handlers to complete
      await new Promise(r => setTimeout(r, 200));

      // Check execution order
      const order = await runInDurableObject(stub, async (instance) => {
        return (instance as any).getHandlerCallOrder();
      });

      expect(order).toEqual(["high-task", "medium-task", "low-task"]);
    });

    it("processes earlier scheduledAt before later, regardless of priority", async () => {
      const stub = getScheduler();
      const baseTime = Date.now() + 100;

      await runInDurableObject(stub, async (instance) => {
        (instance as any).clearHandlerCallOrder();
      });

      // Low priority but earlier time
      await stub.schedule(baseTime, "earlier-low", "order-tracker", {}, { priority: 2 });
      // High priority but later time
      await stub.schedule(baseTime + 50, "later-high", "order-tracker", {}, { priority: 0 });

      // Wait for all scheduled times to pass
      await new Promise(r => setTimeout(r, 200));

      await runDurableObjectAlarm(stub);
      await new Promise(r => setTimeout(r, 200));

      const order = await runInDurableObject(stub, async (instance) => {
        return (instance as any).getHandlerCallOrder();
      });

      // Earlier time should come first even with lower priority
      expect(order[0]).toBe("earlier-low");
      expect(order[1]).toBe("later-high");
    });

    it("maintains FIFO within same priority level", async () => {
      const stub = getScheduler();
      const dueTime = Date.now() + 100;

      await runInDurableObject(stub, async (instance) => {
        (instance as any).clearHandlerCallOrder();
      });

      // All same priority and same time - should maintain insertion order
      await stub.schedule(dueTime, "first", "order-tracker", {}, { priority: 1 });
      await stub.schedule(dueTime, "second", "order-tracker", {}, { priority: 1 });
      await stub.schedule(dueTime, "third", "order-tracker", {}, { priority: 1 });

      // Wait for scheduled time
      await new Promise(r => setTimeout(r, 150));

      await runDurableObjectAlarm(stub);
      await new Promise(r => setTimeout(r, 200));

      const order = await runInDurableObject(stub, async (instance) => {
        return (instance as any).getHandlerCallOrder();
      });

      // Should be in insertion order since all same time and priority
      expect(order).toEqual(["first", "second", "third"]);
    });
  });

  describe("backward compatibility", () => {
    it("treats tasks without priority as medium (1)", async () => {
      const stub = getScheduler();

      // Manually create a task without priority field via internal storage
      await runInDurableObject(stub, async (instance, state) => {
        await state.storage.put("task:legacy-task", {
          taskId: "legacy-task",
          taskName: "test-task",
          params: {},
          scheduledAt: Date.now(),
          startedAt: Date.now(),
          status: "pending",
          progress: {},
          // No priority field
        });
      });

      const task = await stub.getTask("legacy-task");
      // Should be treated as undefined, but queue sorting will default to 1
      expect(task?.priority).toBeUndefined();
    });

    it("legacy tasks sort correctly with new priority tasks", async () => {
      const stub = getScheduler();
      const dueTime = Date.now() + 100;

      // Clear call order first
      await runInDurableObject(stub, async (instance) => {
        (instance as any).clearHandlerCallOrder();
      });

      // Create a legacy task without priority field directly in storage
      await runInDurableObject(stub, async (instance, state) => {
        await state.storage.put("task:legacy-task", {
          taskId: "legacy-task",
          taskName: "order-tracker",
          params: {},
          scheduledAt: dueTime,
          startedAt: dueTime,
          status: "pending",
          progress: {},
          // No priority field - should be treated as 1
        });
      });

      // Create high and low priority tasks (with future time so they queue)
      await stub.schedule(dueTime, "high-task", "order-tracker", {}, { priority: 0 });
      await stub.schedule(dueTime, "low-task", "order-tracker", {}, { priority: 2 });

      // Wait for scheduled time
      await new Promise(r => setTimeout(r, 150));

      await runDurableObjectAlarm(stub);
      await new Promise(r => setTimeout(r, 200));

      const order = await runInDurableObject(stub, async (instance) => {
        return (instance as any).getHandlerCallOrder();
      });

      // High (0) -> Legacy (undefined=1) -> Low (2)
      expect(order[0]).toBe("high-task");
      expect(order[1]).toBe("legacy-task");
      expect(order[2]).toBe("low-task");
    });
  });
});
