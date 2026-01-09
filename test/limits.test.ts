import { describe, it, expect } from "vitest";
import { runInDurableObject } from "cloudflare:test";
import { getScheduler } from "./helpers";
import { TaskLimitExceeded } from "../src/index";

describe("Task Limits", () => {
  describe("maxTotalTasks limit", () => {
    it("creating tasks up to limit succeeds", async () => {
      await runInDurableObject(await getScheduler(), async (instance) => {
        // Clear any existing tasks first
        await instance.clearAll();

        // Should succeed creating tasks (default limit is 10000)
        await expect(instance.runNow("task-1", "test-task")).resolves.not.toThrow();
        await expect(instance.runNow("task-2", "test-task")).resolves.not.toThrow();
        await expect(instance.runNow("task-3", "test-task")).resolves.not.toThrow();
      });
    });

    it("clearCompleted reduces count allowing new tasks", async () => {
      await runInDurableObject(await getScheduler(), async (instance) => {
        // Clear any existing tasks
        await instance.clearAll();

        // Create some tasks
        await instance.runNow("task-1", "test-task");
        await instance.runNow("task-2", "test-task");

        // Wait a bit for tasks to complete
        await new Promise(r => setTimeout(r, 100));

        // Clear completed tasks
        const cleared = await instance.clearCompleted();
        expect(cleared).toBeGreaterThanOrEqual(2);

        // Should still be able to create new tasks (well under default limit of 10000)
        await expect(instance.runNow("task-3", "test-task")).resolves.not.toThrow();
      });
    });

    it("clearAll resets count to 0", async () => {
      await runInDurableObject(await getScheduler(), async (instance) => {
        // Clear any existing tasks
        await instance.clearAll();

        // Create some tasks
        await instance.runNow("task-1", "test-task");
        await instance.runNow("task-2", "test-task");

        // Clear all tasks
        const cleared = await instance.clearAll();
        expect(cleared).toBe(2);

        // Should be able to create new tasks again
        await expect(instance.runNow("task-3", "test-task")).resolves.not.toThrow();
        await expect(instance.runNow("task-4", "test-task")).resolves.not.toThrow();
      });
    });
  });
});