import { ad as head, k as ensure_array_like, m as escape_html } from "../../../../chunks/async.js";
import { C as CodeBlock } from "../../../../chunks/CodeBlock.js";
const API_METHODS = [
  {
    name: "constructor",
    signature: "new ReliableScheduler(storage: DurableObjectStorage)",
    description: "Creates a new scheduler instance with the provided Durable Object storage.",
    type: "constructor"
  },
  {
    name: "generateTaskId",
    signature: 'static generateTaskId(prefix: string = "task"): string',
    description: "Generate a unique task ID. Default prefix is 'task'.",
    type: "static"
  },
  {
    name: "alarm",
    signature: "async alarm(): Promise<void>",
    description: "Call this from your Durable Object's alarm handler to process scheduled tasks.",
    type: "method"
  },
  {
    name: "cancelTask",
    signature: "async cancelTask(taskId: string): Promise<boolean>",
    description: "Cancel and delete a task. Returns true if successful, false if task not found.",
    type: "method"
  },
  {
    name: "checkpoint",
    signature: "async checkpoint(taskId: string, key: string, value: unknown): Promise<void>",
    description: "Save progress for a task. Use this to mark completion of expensive operations.",
    type: "method"
  },
  {
    name: "clearAll",
    signature: "async clearAll(): Promise<number>",
    description: "Delete all tasks regardless of status. Returns the count of deleted tasks.",
    type: "method"
  },
  {
    name: "clearCompleted",
    signature: "async clearCompleted(): Promise<number>",
    description: "Delete all completed tasks. Returns the count of deleted tasks.",
    type: "method"
  },
  {
    name: "completeTask",
    signature: "async completeTask(taskId: string): Promise<void>",
    description: "Mark a task as complete and clean up its state.",
    type: "method"
  },
  {
    name: "formatTaskForUI",
    signature: "formatTaskForUI(task: Task): any",
    description: "Format a task object for UI consumption with standardized fields.",
    type: "method"
  },
  {
    name: "getCheckpoint",
    signature: "async getCheckpoint(taskId: string, key: string): Promise<unknown>",
    description: "Retrieve saved progress for a task. Returns undefined if not found.",
    type: "method"
  },
  {
    name: "getHandler",
    signature: "getHandler(taskName: string): TaskHandler | undefined",
    description: "Get a registered handler by name. Returns undefined if not found.",
    type: "method"
  },
  {
    name: "getTask",
    signature: "async getTask(taskId: string): Promise<Task | undefined>",
    description: "Get a single task by ID. Returns undefined if not found.",
    type: "method"
  },
  {
    name: "getTasks",
    signature: "async getTasks(status?: TaskStatus): Promise<Task[]>",
    description: "Get all tasks, optionally filtered by status.",
    type: "method"
  },
  {
    name: "pauseTask",
    signature: "async pauseTask(taskId: string): Promise<boolean>",
    description: "Pause a running task. Returns true if successful, false if task not found or cannot be paused.",
    type: "method"
  },
  {
    name: "register",
    signature: "register(taskName: string, handler: TaskHandler): void",
    description: "Register a named task handler. The handler receives the scheduler, taskId, and params.",
    type: "method"
  },
  {
    name: "resumeTask",
    signature: "async resumeTask(taskId: string): Promise<boolean>",
    description: "Resume a paused task. Returns true if successful, false if task not found or not paused.",
    type: "method"
  },
  {
    name: "runNow",
    signature: "async runNow((): Promise<void>",
    description: "Start a task immediately with eviction safety. Sets a 30s safety alarm for automatic retry. @param options.maxRetries - Override default retry count (default: 3, use Infinity for infinite loop tasks)",
    type: "method"
  },
  {
    name: "runSteps",
    signature: "async runSteps((): Promise<void>",
    description: "Execute a multi-step task with automatic progress tracking, pause/resume support, checkpointing, and optional auto-completion.",
    type: "method"
  },
  {
    name: "runSubSteps",
    signature: "async runSubSteps(taskId: string, stepName: string, stepIndex: number, totalSteps: number, subStepCount: number, subStepDuration: number, onSubStep?: (subStepIndex: number) => Promise<void> | Effect.Effect<void>): Promise<void>",
    description: "Helper for sub-step execution within a step. Handles pause checks and progress tracking automatically.",
    type: "method"
  },
  {
    name: "schedule",
    signature: "async schedule((): Promise<void>",
    description: "Schedule a task to run at a future time (Unix timestamp or Date).",
    type: "method"
  }
];
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const constructorMethods = API_METHODS.filter((m) => m.type === "constructor");
    const staticMethods = API_METHODS.filter((m) => m.type === "static");
    const instanceMethods = API_METHODS.filter((m) => m.type === "method");
    const coreExecution = ["runNow", "schedule", "alarm", "register"];
    const taskManagement = [
      "getTask",
      "getTasks",
      "cancelTask",
      "pauseTask",
      "resumeTask",
      "completeTask"
    ];
    const progress = ["checkpoint", "getCheckpoint", "runSteps", "runSubSteps"];
    const utilities = [
      "clearCompleted",
      "clearAll",
      "formatTaskForUI",
      "getHandler"
    ];
    function getMethodsByNames(names) {
      return names.map((name) => instanceMethods.find((m) => m.name === name)).filter(Boolean);
    }
    head("1c8t0id", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>API Reference - ironalarm</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen"><div class="max-w-5xl mx-auto px-6 py-16"><div class="mb-12"><h1 class="text-4xl font-bold mb-4 tracking-tight text-zinc-100">API Reference</h1> <p class="text-xl text-zinc-500">Complete API documentation for the ReliableScheduler class.</p></div> <nav class="mb-12 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50"><div class="flex flex-wrap gap-2 text-sm"><a href="#constructor" class="px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200">Constructor</a> <a href="#static" class="px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200">Static Methods</a> <a href="#core" class="px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200">Core Execution</a> <a href="#management" class="px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200">Task Management</a> <a href="#progress" class="px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200">Progress &amp; Steps</a> <a href="#utilities" class="px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200">Utilities</a></div></nav> <section id="constructor" class="mb-12"><h2 class="text-2xl font-semibold mb-6 pb-2 border-b border-zinc-800/50 text-zinc-100">Constructor</h2> <!--[-->`);
    const each_array = ensure_array_like(constructorMethods);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let method = each_array[$$index];
      $$renderer2.push(`<div>`);
      CodeBlock($$renderer2, { code: method.signature, lang: "typescript" });
      $$renderer2.push(`<!----> <p class="mt-3 text-zinc-500">${escape_html(method.description)}</p></div>`);
    }
    $$renderer2.push(`<!--]--></section> <section id="static" class="mb-12"><h2 class="text-2xl font-semibold mb-6 pb-2 border-b border-zinc-800/50 text-zinc-100">Static Methods</h2> <div class="space-y-6"><!--[-->`);
    const each_array_1 = ensure_array_like(staticMethods);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let method = each_array_1[$$index_1];
      $$renderer2.push(`<div>`);
      CodeBlock($$renderer2, { code: method.signature, lang: "typescript" });
      $$renderer2.push(`<!----> <p class="mt-3 text-zinc-500">${escape_html(method.description)}</p></div>`);
    }
    $$renderer2.push(`<!--]--></div></section> <section id="core" class="mb-12"><h2 class="text-2xl font-semibold mb-6 pb-2 border-b border-zinc-800/50 text-zinc-100">Core Execution</h2> <div class="space-y-6"><!--[-->`);
    const each_array_2 = ensure_array_like(getMethodsByNames(coreExecution));
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let method = each_array_2[$$index_2];
      if (method) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div><h3 class="font-mono text-lg font-semibold text-orange-400 mb-2">${escape_html(method.name)}()</h3> `);
        CodeBlock($$renderer2, { code: method.signature, lang: "typescript" });
        $$renderer2.push(`<!----> <p class="mt-3 text-zinc-500">${escape_html(method.description)}</p></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></section> <section id="management" class="mb-12"><h2 class="text-2xl font-semibold mb-6 pb-2 border-b border-zinc-800/50 text-zinc-100">Task Management</h2> <div class="space-y-6"><!--[-->`);
    const each_array_3 = ensure_array_like(getMethodsByNames(taskManagement));
    for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
      let method = each_array_3[$$index_3];
      if (method) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div><h3 class="font-mono text-lg font-semibold text-orange-400 mb-2">${escape_html(method.name)}()</h3> `);
        CodeBlock($$renderer2, { code: method.signature, lang: "typescript" });
        $$renderer2.push(`<!----> <p class="mt-3 text-zinc-500">${escape_html(method.description)}</p></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></section> <section id="progress" class="mb-12"><h2 class="text-2xl font-semibold mb-6 pb-2 border-b border-zinc-800/50 text-zinc-100">Progress &amp; Steps</h2> <div class="space-y-6"><!--[-->`);
    const each_array_4 = ensure_array_like(getMethodsByNames(progress));
    for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
      let method = each_array_4[$$index_4];
      if (method) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div><h3 class="font-mono text-lg font-semibold text-orange-400 mb-2">${escape_html(method.name)}()</h3> `);
        CodeBlock($$renderer2, { code: method.signature, lang: "typescript" });
        $$renderer2.push(`<!----> <p class="mt-3 text-zinc-500">${escape_html(method.description)}</p></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></section> <section id="utilities" class="mb-12"><h2 class="text-2xl font-semibold mb-6 pb-2 border-b border-zinc-800/50 text-zinc-100">Utilities</h2> <div class="space-y-6"><!--[-->`);
    const each_array_5 = ensure_array_like(getMethodsByNames(utilities));
    for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
      let method = each_array_5[$$index_5];
      if (method) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div><h3 class="font-mono text-lg font-semibold text-orange-400 mb-2">${escape_html(method.name)}()</h3> `);
        CodeBlock($$renderer2, { code: method.signature, lang: "typescript" });
        $$renderer2.push(`<!----> <p class="mt-3 text-zinc-500">${escape_html(method.description)}</p></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></section> <section id="types" class="mb-12"><h2 class="text-2xl font-semibold mb-6 pb-2 border-b border-zinc-800/50 text-zinc-100">Types</h2> <div class="space-y-6"><div><h3 class="font-mono text-lg font-semibold text-orange-400 mb-2">TaskStatus</h3> `);
    CodeBlock($$renderer2, {
      code: 'type TaskStatus = "pending" | "running" | "paused" | "completed" | "failed"',
      lang: "typescript"
    });
    $$renderer2.push(`<!----></div> <div><h3 class="font-mono text-lg font-semibold text-orange-400 mb-2">Task</h3> `);
    CodeBlock($$renderer2, {
      code: `interface Task {
  taskId: string;
  taskName: string;
  params: unknown;
  scheduledAt: number;
  startedAt: number;
  status: TaskStatus;
  safetyAlarmAt?: number;
  progress: Record<string, unknown>;
  retryCount?: number;
  maxRetries?: number;
  pausedAt?: number;
}`,
      lang: "typescript"
    });
    $$renderer2.push(`<!----></div> <div><h3 class="font-mono text-lg font-semibold text-orange-400 mb-2">TaskHandler</h3> `);
    CodeBlock($$renderer2, {
      code: `type TaskHandler = (
  scheduler: ReliableScheduler,
  taskId: string,
  params: unknown
) => Effect.Effect<void>`,
      lang: "typescript"
    });
    $$renderer2.push(`<!----></div></div></section></div></div>`);
  });
}
export {
  _page as default
};
