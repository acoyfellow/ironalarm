import { describe, it, expect } from "vitest";
import { env, runInDurableObject } from "cloudflare:test";
import { getScheduler } from "./helpers";
import { ValidationError } from "../src/index";

describe("Input Validation", () => {

  describe("taskId validation", () => {
    it("accepts valid taskId 'my-task-123'", async () => {
      await runInDurableObject(await getScheduler(), async (instance) => {
        await expect(instance.runNow("my-task-123", "test-task")).resolves.not.toThrow();
      });
    });

    it("rejects taskId with slashes '../etc'", async () => {
      await runInDurableObject(await getScheduler(), async (instance) => {
        try {
          await instance.runNow("../etc", "test-task");
          expect(false).toBe(true); // Should have thrown
        } catch (e) {
          expect(e).toBeInstanceOf(Error);
          expect(String(e)).toContain("ValidationError");
        }
      });
    });

    it("rejects taskId over 128 characters", async () => {
      const longId = "a".repeat(129);
      await runInDurableObject(await getScheduler(), async (instance) => {
        try {
          await instance.runNow(longId, "test-task");
          expect(false).toBe(true); // Should have thrown
        } catch (e) {
          expect(e).toBeInstanceOf(Error);
          expect(String(e)).toContain("ValidationError");
        }
      });
    });

    it("rejects empty taskId", async () => {
      await runInDurableObject(await getScheduler(), async (instance) => {
        try {
          await instance.runNow("", "test-task");
          expect(false).toBe(true); // Should have thrown
        } catch (e) {
          expect(e).toBeInstanceOf(Error);
          expect(String(e)).toContain("ValidationError");
        }
      });
    });

    it("rejects taskId with spaces", async () => {
      await runInDurableObject(await getScheduler(), async (instance) => {
        try {
          await instance.runNow("task with spaces", "test-task");
          expect(false).toBe(true); // Should have thrown
        } catch (e) {
          expect(e).toBeInstanceOf(Error);
          expect(String(e)).toContain("ValidationError");
        }
      });
    });
  });

  describe("taskName validation", () => {
    it("accepts valid taskName 'agent_loop'", async () => {
      await runInDurableObject(await getScheduler(), async (instance) => {
        await expect(instance.runNow("task-1", "agent_loop")).rejects.toThrow(); // HandlerMissing expected
      });
    });

    it("rejects taskName with spaces", async () => {
      await runInDurableObject(await getScheduler(), async (instance) => {
        try {
          await instance.runNow("task-1", "task with spaces");
          expect(false).toBe(true); // Should have thrown
        } catch (e) {
          expect(e).toBeInstanceOf(Error);
          expect(String(e)).toContain("ValidationError");
        }
      });
    });

    it("rejects taskName over 128 characters", async () => {
      const longName = "a".repeat(129);
      await runInDurableObject(await getScheduler(), async (instance) => {
        try {
          await instance.runNow("task-1", longName);
          expect(false).toBe(true); // Should have thrown
        } catch (e) {
          expect(e).toBeInstanceOf(Error);
          expect(String(e)).toContain("ValidationError");
        }
      });
    });

    it("rejects empty taskName", async () => {
      await runInDurableObject(await getScheduler(), async (instance) => {
        try {
          await instance.runNow("task-1", "");
          expect(false).toBe(true); // Should have thrown
        } catch (e) {
          expect(e).toBeInstanceOf(Error);
          expect(String(e)).toContain("ValidationError");
        }
      });
    });
  });

  describe("schedule() validation", () => {
    it("accepts valid identifiers", async () => {
      await runInDurableObject(await getScheduler(), async (instance) => {
        const futureTime = Date.now() + 1000;
        await expect(instance.schedule(futureTime, "my-task-123", "test-task")).resolves.not.toThrow();
      });
    });

    it("rejects invalid taskId", async () => {
      await runInDurableObject(await getScheduler(), async (instance) => {
        const futureTime = Date.now() + 1000;
        try {
          await instance.schedule(futureTime, "../etc", "test-task");
          expect(false).toBe(true); // Should have thrown
        } catch (e) {
          expect(e).toBeInstanceOf(Error);
          expect(String(e)).toContain("ValidationError");
        }
      });
    });

    it("rejects invalid taskName", async () => {
      await runInDurableObject(await getScheduler(), async (instance) => {
        const futureTime = Date.now() + 1000;
        try {
          await instance.schedule(futureTime, "task-1", "invalid name");
          expect(false).toBe(true); // Should have thrown
        } catch (e) {
          expect(e).toBeInstanceOf(Error);
          expect(String(e)).toContain("ValidationError");
        }
      });
    });
  });
});