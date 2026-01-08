import { env, runInDurableObject } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { getScheduler, waitFor } from "./helpers";

describe("ReliableScheduler runSteps", () => {
  describe("runSteps()", () => {
    it("executes all steps and resumes from checkpoint", async () => {
      const stub = getScheduler();
      
      await stub.runNow("steps-task", "step-task", { steps: ["step1", "step2", "step3"] });
      await waitFor(300);
      
      const task = await stub.getTask("steps-task");
      expect(task?.status).toBe("completed");
      expect(task?.progress.step).toBe("done");
      expect(task?.progress.progress).toBe("100%");
    });

    it("handles pause/resume correctly", async () => {
      const stub = getScheduler();
      
      // Create task manually so we can control it
      await runInDurableObject(stub, async (instance, state) => {
        await state.storage.put("task:pause-steps-task", {
          taskId: "pause-steps-task",
          taskName: "test-task",
          params: {},
          scheduledAt: Date.now(),
          startedAt: Date.now(),
          status: "running",
          progress: {},
          priority: 1,
        });
      });
      
      // Pause the task first
      const pauseResult = await stub.pauseTask("pause-steps-task");
      expect(pauseResult).toBe(true);
      
      const paused = await stub.getTask("pause-steps-task");
      expect(paused?.status).toBe("paused");
      
      // Start runSteps - it should check pause status and exit early
      await stub.runSteps("pause-steps-task", ["step1", "step2", "step3"], {
        stepDuration: 10
      });
      
      // Task should still be paused (runSteps exits early on pause)
      const stillPaused = await stub.getTask("pause-steps-task");
      expect(stillPaused?.status).toBe("paused");
      
      // Resume and complete manually
      await stub.resumeTask("pause-steps-task");
      await stub.completeTask("pause-steps-task");
      
      const completed = await stub.getTask("pause-steps-task");
      expect(completed?.status).toBe("completed");
    });

    it("with autoComplete: false doesn't auto-complete", async () => {
      const stub = getScheduler();
      
      // Create a task manually (not through handler) so we control completion
      await runInDurableObject(stub, async (instance, state) => {
        await state.storage.put("task:no-auto-task", {
          taskId: "no-auto-task",
          taskName: "test-task",
          params: {},
          scheduledAt: Date.now(),
          startedAt: Date.now(),
          status: "running",
          progress: {},
          priority: 1,
        });
      });
      
      // Mark first step as done
      await stub.checkpoint("no-auto-task", "step1_done", true);
      
      await stub.runSteps("no-auto-task", ["step1", "step2"], {
        autoComplete: false,
        stepDuration: 10
      });
      await waitFor(200);
      
      const task = await stub.getTask("no-auto-task");
      // Task should have completed all steps but not be auto-completed
      expect(task?.progress.step).toBe("done");
      expect(task?.progress.progress).toBe("100%");
      // Should still be running, not completed (since autoComplete: false)
      expect(task?.status).toBe("running");
    });
  });

  describe("runSubSteps()", () => {
    it("executes and updates progress", async () => {
      const stub = getScheduler();
      
      await stub.runNow("substeps-task", "test-task");
      await waitFor(50); // Let task start
      
      await stub.runSubSteps(
        "substeps-task",
        "substep",
        0,
        2,
        3,
        10,
        async (i) => {
          await waitFor(5);
        }
      );
      
      // Ensure all operations complete
      await waitFor(50);
      
      const task = await stub.getTask("substeps-task");
      expect(task?.progress.step).toContain("substep");
      expect(task?.progress.progress).toBeDefined();
    });
  });

  describe("formatTaskForUI()", () => {
    it("formats task correctly", async () => {
      const stub = getScheduler();
      
      // Create task manually and pause it immediately to avoid race condition
      await runInDurableObject(stub, async (instance, state) => {
        await state.storage.put("task:ui-task", {
          taskId: "ui-task",
          taskName: "test-task",
          params: {},
          scheduledAt: Date.now(),
          startedAt: Date.now(),
          status: "paused",
          progress: {},
          priority: 1,
          pausedAt: Date.now() - 100,
          totalPausedMs: 50,
        });
      });
      
      const task = await stub.getTask("ui-task");
      expect(task).toBeDefined();
      expect(task?.status).toBe("paused");
      
      await runInDurableObject(stub, async (instance) => {
        const formatted = (instance.scheduler as any).formatTaskForUI(task!);
        
        expect(formatted.taskId).toBe("ui-task");
        expect(formatted.taskName).toBe("test-task");
        expect(formatted.status).toBe("paused");
        expect(formatted.startedAt).toBeDefined();
        expect(formatted.pausedAt).toBeDefined();
        expect(formatted.totalPausedMs).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

