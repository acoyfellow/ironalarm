<script lang="ts">
  import { API_METHODS } from "$lib/api-docs";
  import CodeBlock from "$lib/components/CodeBlock.svelte";

  const constructorMethods = API_METHODS.filter((m) => m.type === "constructor");
  const staticMethods = API_METHODS.filter((m) => m.type === "static");
  const instanceMethods = API_METHODS.filter((m) => m.type === "method");

  // Group instance methods by category
  const coreExecution = ["runNow", "schedule", "alarm", "register"];
  const taskManagement = [
    "getTask",
    "getTasks",
    "cancelTask",
    "pauseTask",
    "resumeTask",
    "completeTask",
  ];
  const progress = [
    "checkpoint",
    "getCheckpoint",
    "runSteps",
    "runSubSteps",
  ];
  const utilities = [
    "clearCompleted",
    "clearAll",
    "formatTaskForUI",
    "getHandler",
  ];

  function getMethodsByNames(names: string[]) {
    return names
      .map((name) => instanceMethods.find((m) => m.name === name))
      .filter(Boolean);
  }
</script>

<svelte:head>
  <title>API Reference - ironalarm</title>
</svelte:head>

<div class="min-h-screen">
  <div class="max-w-5xl mx-auto px-6 py-16">
    <!-- Header -->
    <div class="mb-12">
      <h1 class="text-4xl font-bold mb-4 tracking-tight text-zinc-100">API Reference</h1>
      <p class="text-xl text-zinc-500">
        Complete API documentation for the ReliableScheduler class.
      </p>
    </div>

    <!-- Quick Nav -->
    <nav class="mb-12 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
      <div class="flex flex-wrap gap-2 text-sm">
        <a href="#constructor" class="px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200">Constructor</a>
        <a href="#static" class="px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200">Static Methods</a>
        <a href="#core" class="px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200">Core Execution</a>
        <a href="#management" class="px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200">Task Management</a>
        <a href="#progress" class="px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200">Progress & Steps</a>
        <a href="#utilities" class="px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200">Utilities</a>
      </div>
    </nav>

    <!-- Constructor -->
    <section id="constructor" class="mb-12">
      <h2 class="text-2xl font-semibold mb-6 pb-2 border-b border-zinc-800/50 text-zinc-100">Constructor</h2>
      {#each constructorMethods as method}
        <div>
          <CodeBlock code={method.signature} lang="typescript" />
          <p class="mt-3 text-zinc-500">{method.description}</p>
        </div>
      {/each}
    </section>

    <!-- Static Methods -->
    <section id="static" class="mb-12">
      <h2 class="text-2xl font-semibold mb-6 pb-2 border-b border-zinc-800/50 text-zinc-100">Static Methods</h2>
      <div class="space-y-6">
        {#each staticMethods as method}
          <div>
            <CodeBlock code={method.signature} lang="typescript" />
            <p class="mt-3 text-zinc-500">{method.description}</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- Core Execution -->
    <section id="core" class="mb-12">
      <h2 class="text-2xl font-semibold mb-6 pb-2 border-b border-zinc-800/50 text-zinc-100">Core Execution</h2>
      <div class="space-y-6">
        {#each getMethodsByNames(coreExecution) as method}
          {#if method}
            <div>
              <h3 class="font-mono text-lg font-semibold text-orange-400 mb-2">{method.name}()</h3>
              <CodeBlock code={method.signature} lang="typescript" />
              <p class="mt-3 text-zinc-500">{method.description}</p>
            </div>
          {/if}
        {/each}
      </div>
    </section>

    <!-- Task Management -->
    <section id="management" class="mb-12">
      <h2 class="text-2xl font-semibold mb-6 pb-2 border-b border-zinc-800/50 text-zinc-100">Task Management</h2>
      <div class="space-y-6">
        {#each getMethodsByNames(taskManagement) as method}
          {#if method}
            <div>
              <h3 class="font-mono text-lg font-semibold text-orange-400 mb-2">{method.name}()</h3>
              <CodeBlock code={method.signature} lang="typescript" />
              <p class="mt-3 text-zinc-500">{method.description}</p>
            </div>
          {/if}
        {/each}
      </div>
    </section>

    <!-- Progress & Steps -->
    <section id="progress" class="mb-12">
      <h2 class="text-2xl font-semibold mb-6 pb-2 border-b border-zinc-800/50 text-zinc-100">Progress & Steps</h2>
      <div class="space-y-6">
        {#each getMethodsByNames(progress) as method}
          {#if method}
            <div>
              <h3 class="font-mono text-lg font-semibold text-orange-400 mb-2">{method.name}()</h3>
              <CodeBlock code={method.signature} lang="typescript" />
              <p class="mt-3 text-zinc-500">{method.description}</p>
            </div>
          {/if}
        {/each}
      </div>
    </section>

    <!-- Utilities -->
    <section id="utilities" class="mb-12">
      <h2 class="text-2xl font-semibold mb-6 pb-2 border-b border-zinc-800/50 text-zinc-100">Utilities</h2>
      <div class="space-y-6">
        {#each getMethodsByNames(utilities) as method}
          {#if method}
            <div>
              <h3 class="font-mono text-lg font-semibold text-orange-400 mb-2">{method.name}()</h3>
              <CodeBlock code={method.signature} lang="typescript" />
              <p class="mt-3 text-zinc-500">{method.description}</p>
            </div>
          {/if}
        {/each}
      </div>
    </section>

    <!-- Types Reference -->
    <section id="types" class="mb-12">
      <h2 class="text-2xl font-semibold mb-6 pb-2 border-b border-zinc-800/50 text-zinc-100">Types</h2>
      <div class="space-y-6">
        <div>
          <h3 class="font-mono text-lg font-semibold text-orange-400 mb-2">TaskStatus</h3>
          <CodeBlock code='type TaskStatus = "pending" | "running" | "paused" | "completed" | "failed"' lang="typescript" />
        </div>
        <div>
          <h3 class="font-mono text-lg font-semibold text-orange-400 mb-2">Task</h3>
          <CodeBlock code={`interface Task {
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
}`} lang="typescript" />
        </div>
        <div>
          <h3 class="font-mono text-lg font-semibold text-orange-400 mb-2">TaskHandler</h3>
          <CodeBlock code={`type TaskHandler = (
  scheduler: ReliableScheduler,
  taskId: string,
  params: unknown
) => Effect.Effect<void>`} lang="typescript" />
        </div>
      </div>
    </section>
  </div>
</div>
