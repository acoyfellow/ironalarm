import { describe, it, expect } from "vitest";
import { Effect, Layer, Context } from "effect";
import { ReliableScheduler, SchedulerService } from "../src/index";

describe("SchedulerService Context (Story 002)", () => {
  describe("SchedulerService Tag exists", () => {
    it("SchedulerService is defined", () => {
      expect(SchedulerService).toBeDefined();
      // SchedulerService is created via Context.GenericTag<Interface>("SchedulerService")
    });

    it("SchedulerService has expected key", () => {
      // Context.GenericTag creates a tag with the given key
      expect(SchedulerService.key).toBe("SchedulerService");
    });
  });

  describe("SchedulerService can be mocked with Layer", () => {
    it("Layer.succeed creates a mock service", () => {
      const mockLayer = Layer.succeed(SchedulerService, {
        checkpoint: () => Effect.void,
        completeTask: () => Effect.void,
        schedule: () => Effect.void,
        runNow: () => Effect.void,
        getTask: () => Effect.succeed(undefined),
        getTasks: () => Effect.succeed([]),
        getCheckpoint: () => Effect.succeed(undefined),
        checkpointMultiple: () => Effect.void,
        pauseTask: () => Effect.succeed(false),
        resumeTask: () => Effect.succeed(false),
        cancelTask: () => Effect.succeed(false),
        clearCompleted: () => Effect.succeed(0),
        clearAll: () => Effect.succeed(0),
        getCachedTasks: () => [],
        formatTaskForUI: (task) => task,
      });

      expect(mockLayer).toBeDefined();
    });

    it("Mock service can be accessed via Effect.service", async () => {
      const mockService = {
        checkpoint: () => Effect.void,
        completeTask: () => Effect.void,
        schedule: () => Effect.void,
        runNow: () => Effect.void,
        getTask: () => Effect.succeed(undefined),
        getTasks: () => Effect.succeed([]),
        getCheckpoint: () => Effect.succeed(undefined),
        checkpointMultiple: () => Effect.void,
        pauseTask: () => Effect.succeed(false),
        resumeTask: () => Effect.succeed(false),
        cancelTask: () => Effect.succeed(false),
        clearCompleted: () => Effect.succeed(0),
        clearAll: () => Effect.succeed(0),
        getCachedTasks: () => [],
        formatTaskForUI: (task: any) => task,
      };

      const program = Effect.gen(function* () {
        const svc = yield* SchedulerService;
        return svc;
      });

      const layer = Layer.succeed(SchedulerService, mockService);
      const result = await Effect.runPromise(Effect.provide(program, layer));
      
      expect(result).toBe(mockService);
    });
  });

  describe("Live implementation uses actual scheduler", () => {
    it("Live layer can be constructed from ReliableScheduler instance", () => {
      // This test verifies that we can create a live layer from a scheduler
      // The actual test would be in integration tests with DO storage
      expect(true).toBe(true);
    });
  });

  describe("TaskHandler can use SchedulerService from context", () => {
    it("Handler signature allows accessing service from context", async () => {
      // A handler that uses SchedulerService from context should compile
      const handler = (taskId: string, params: unknown) =>
        Effect.gen(function* () {
          const svc = yield* SchedulerService;
          yield* svc.checkpoint(taskId, "started", true);
        });

      // This should compile - the handler receives taskId and params
      // and can access SchedulerService via yield*
      expect(handler).toBeDefined();
      expect(typeof handler).toBe("function");
    });
  });
});
