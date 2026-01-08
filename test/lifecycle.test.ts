import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("ReliableScheduler Lifecycle", () => {
  const getScheduler = () => {
    const id = env.SCHEDULER_DO.idFromName(`test-${Date.now()}-${Math.random()}`);
    return env.SCHEDULER_DO.get(id);
  };

  describe("pauseTask", () => {
    it("pauses a pending task", async () => {
      const stub = getScheduler();
      // Schedule in future so it stays pending
      await stub.schedule(Date.now() + 60000, "task-1", "long-task");

      const result = await stub.pauseTask("task-1");
      expect(result).toBe(true);

      const task = await stub.getTask("task-1");
      expect(task?.status).toBe("paused");
      expect(task?.pausedAt).toBeDefined();
    });

    it("pauses a running task before completion", async () => {
      const stub = getScheduler();
      // runNow creates a running task - race to pause before completion
      await stub.runNow("task-1", "long-task", { steps: 100 });
      // Try to pause - may succeed or fail if task already completed
      const result = await stub.pauseTask("task-1");

      const task = await stub.getTask("task-1");
      if (result) {
        // If pause succeeded, status should be paused
        expect(task?.status).toBe("paused");
      } else {
        // If pause failed, task completed before we could pause
        expect(["completed", "failed"]).toContain(task?.status);
      }
    });

    it("returns false for already paused task", async () => {
      const stub = getScheduler();
      await stub.schedule(Date.now() + 60000, "task-1", "long-task");
      await stub.pauseTask("task-1");

      const result = await stub.pauseTask("task-1");
      expect(result).toBe(false);
    });

    it("returns false for completed task", async () => {
      const stub = getScheduler();
      await stub.schedule(Date.now() + 60000, "task-1", "long-task");
      await stub.completeTask("task-1");

      const result = await stub.pauseTask("task-1");
      expect(result).toBe(false);
    });

    it("returns false for non-existent task", async () => {
      const stub = getScheduler();
      const result = await stub.pauseTask("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("resumeTask", () => {
    it("resumes a paused task", async () => {
      const stub = getScheduler();
      // Schedule in future - this creates a pending task
      await stub.schedule(Date.now() + 60000, "task-1", "long-task");
      await stub.pauseTask("task-1");

      // Verify paused
      let task = await stub.getTask("task-1");
      expect(task?.status).toBe("paused");

      const result = await stub.resumeTask("task-1");
      expect(result).toBe(true);

      // After resume, status should be running (or completed if handler finished)
      task = await stub.getTask("task-1");
      expect(["running", "completed"]).toContain(task?.status);
      expect(task?.pausedAt).toBeUndefined();
    });

    it("tracks total paused time", async () => {
      const stub = getScheduler();
      await stub.schedule(Date.now() + 60000, "task-1", "long-task");
      await stub.pauseTask("task-1");

      // Wait a bit
      await new Promise(r => setTimeout(r, 100));

      await stub.resumeTask("task-1");

      const task = await stub.getTask("task-1");
      expect(task?.totalPausedMs).toBeGreaterThan(0);
    });

    it("returns false for non-paused task", async () => {
      const stub = getScheduler();
      // Schedule in future so it stays pending (not paused)
      await stub.schedule(Date.now() + 60000, "task-1", "long-task");

      const result = await stub.resumeTask("task-1");
      expect(result).toBe(false);
    });

    it("sets new safety alarm on resume", async () => {
      const stub = getScheduler();
      await stub.schedule(Date.now() + 60000, "task-1", "long-task");
      await stub.pauseTask("task-1");

      const beforeResume = Date.now();
      await stub.resumeTask("task-1");

      const task = await stub.getTask("task-1");
      expect(task?.safetyAlarmAt).toBeGreaterThan(beforeResume);
    });
  });

  describe("cancelTask", () => {
    it("deletes a task", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "test-task");

      const result = await stub.cancelTask("task-1");
      expect(result).toBe(true);

      const task = await stub.getTask("task-1");
      expect(task).toBeUndefined();
    });

    it("returns false for non-existent task", async () => {
      const stub = getScheduler();
      const result = await stub.cancelTask("non-existent");
      expect(result).toBe(false);
    });

    it("can cancel paused tasks", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "long-task");
      await stub.pauseTask("task-1");

      const result = await stub.cancelTask("task-1");
      expect(result).toBe(true);

      const task = await stub.getTask("task-1");
      expect(task).toBeUndefined();
    });
  });

  describe("completeTask", () => {
    it("marks task as completed", async () => {
      const stub = getScheduler();
      await stub.runNow("task-1", "long-task");

      await stub.completeTask("task-1");

      const task = await stub.getTask("task-1");
      expect(task?.status).toBe("completed");
      expect(task?.progress.completed).toBe(true);
    });
  });

  describe("clearCompleted", () => {
    it("removes completed tasks and returns count", async () => {
      const stub = getScheduler();
      // Schedule in future so they don't auto-execute
      const future = Date.now() + 60000;
      await stub.schedule(future, "task-1", "long-task");
      await stub.schedule(future, "task-2", "long-task");

      // Complete task-1
      await stub.completeTask("task-1");

      const count = await stub.clearCompleted();
      expect(count).toBe(1);
    });

    it("returns 0 when no completed tasks", async () => {
      const stub = getScheduler();
      // Schedule in future so it doesn't auto-execute
      await stub.schedule(Date.now() + 60000, "task-1", "long-task");

      const count = await stub.clearCompleted();
      expect(count).toBe(0);
    });
  });

  describe("clearAll", () => {
    it("removes all tasks and returns count", async () => {
      const stub = getScheduler();
      // Schedule all in future so they don't auto-execute
      const future = Date.now() + 60000;
      await stub.schedule(future, "task-1", "long-task");
      await stub.schedule(future, "task-2", "long-task");

      const count = await stub.clearAll();
      expect(count).toBe(2);
    });
  });
});
