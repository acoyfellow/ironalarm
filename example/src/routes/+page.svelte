<script lang="ts">
  import InteractiveDemo from "$lib/components/InteractiveDemo.svelte";
  import CodeBlock from "$lib/components/CodeBlock.svelte";
  import ApiMethod from "$lib/components/ApiMethod.svelte";

  const quickStartCode = `import { ReliableScheduler } from 'ironalarm';

export class MyDO {
  private scheduler: ReliableScheduler;

  constructor(state: DurableObjectState, env: any) {
    // Initialize with DO storage
    this.scheduler = new ReliableScheduler(state.storage);

    // Register a resumable task handler
    this.scheduler.register('my-task', async (sched, taskId, params) => {
      if (!await sched.getCheckpoint(taskId, 'started')) {
        await doWork(params);
        await sched.checkpoint(taskId, 'started', true);
      }
      await sched.completeTask(taskId);
    });
  }

  async alarm() {
    await this.scheduler.alarm();
  }
}`;
</script>

<svelte:head>
  <title
    >ironalarm - Reliable task scheduling for Cloudflare Durable Objects</title
  >
</svelte:head>

<div class="relative">
  <!-- Background effects -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none">
    <div
      class="absolute -top-40 -right-40 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl"
    ></div>
    <div
      class="absolute top-1/2 -left-40 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl"
    ></div>
  </div>

  <div class="relative max-w-5xl mx-auto px-6">
    <!-- Hero -->
    <section class="py-20 border-b border-zinc-800/50">
      <div
        class="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-400 mb-6"
      >
        <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
        Now with checkpoint recovery
      </div>

      <h1 class="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
        Reliable task scheduling for<br />
        <span
          class="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400"
          >Cloudflare Durable Objects</span
        >
      </h1>

      <p class="text-lg text-zinc-500 max-w-2xl mb-8">
        The "reliable runNow" pattern for resilient long-running tasks with
        automatic checkpoint recovery. Never lose progress to eviction again.
      </p>

      <div class="flex items-center gap-4 flex-wrap">
        <div
          class="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm"
        >
          <span class="text-zinc-500">$</span>
          <span class="text-zinc-300">bun install ironalarm</span>
          <button
            onclick={() => {
              navigator.clipboard.writeText("bun install ironalarm");
            }}
            class="ml-2 text-zinc-600 hover:text-zinc-400 transition-colors"
            aria-label="Copy install command"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
        <a
          href="#demo"
          class="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-medium text-sm rounded-lg transition-all"
        >
          Try the demo
        </a>
      </div>
    </section>

    <!-- Problem -->
    <section id="docs" class="py-16 border-b border-zinc-800/50">
      <h2 class="text-2xl font-semibold mb-4">The Problem</h2>
      <p class="text-zinc-400 max-w-3xl">
        Cloudflare Durable Objects can evict your code after ~144 seconds of
        inactivity. For long-running operations (like AI agent loops), a single
        eviction mid-task breaks your workflow.
      </p>
      <p class="text-zinc-400 max-w-3xl mt-4">
        <span class="text-zinc-200">ironalarm</span> solves this with a lightweight,
        userspace implementation that persists task state and uses a 30-second safety
        alarm net—if evicted, the task automatically retries and resumes from checkpoints.
      </p>
    </section>

    <!-- Features -->
    <section class="py-16 border-b border-zinc-800/50">
      <h2 class="text-2xl font-semibold mb-8">Features</h2>
      <div class="grid md:grid-cols-2 gap-4">
        {#each [{ title: "Reliable execution", desc: "runNow() starts immediately with 30s safety alarm for eviction recovery" }, { title: "Checkpoints", desc: "User-managed progress tracking for resumable work after evictions" }, { title: "Named handlers", desc: "Register task handlers by name—no function serialization required" }, { title: "Minimal", desc: "~300 LOC, zero dependencies, fully serializable tasks" }] as f}
          <div class="p-5 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
            <h3 class="text-sm font-medium text-zinc-200 mb-1">{f.title}</h3>
            <p class="text-sm text-zinc-500">{f.desc}</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- Quick Start -->
    <section class="py-16 border-b border-zinc-800/50">
      <h2 class="text-2xl font-semibold mb-6">Quick Start</h2>
      <CodeBlock code={quickStartCode} lang="typescript" />
    </section>

    <!-- API Reference -->
    <section id="api" class="py-16 border-b border-zinc-800/50">
      <h2 class="text-2xl font-semibold mb-2">API Reference</h2>
      <p class="text-sm text-zinc-500 mb-8">
        All methods available on the ReliableScheduler class.
      </p>

      <div class="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6">
        <div class="mb-6 pb-6 border-b border-zinc-800/50">
          <h3 class="text-sm font-medium text-zinc-300 mb-2">Constructor</h3>
          <code class="text-sm font-mono">
            <span class="text-purple-400">new</span>
            <span class="text-orange-400">ReliableScheduler</span>(<span
              class="text-zinc-400">storage: DurableObjectStorage</span
            >)
          </code>
          <p class="text-sm text-zinc-500 mt-2">
            Creates a new scheduler instance with the provided Durable Object
            storage.
          </p>
        </div>

        <h3 class="text-sm font-medium text-zinc-300 mb-4">Methods</h3>
        <div class="space-y-0 divide-y divide-zinc-800/50">
          <ApiMethod
            name="register"
            signature="(taskName: string, handler: Function)"
            description="Register a named task handler. The handler receives the scheduler, taskId, and params."
          />
          <ApiMethod
            name="runNow"
            signature="(taskId: string, taskName: string, params?: any)"
            description="Start a task immediately with eviction safety. Sets a 30s safety alarm for automatic retry."
          />
          <ApiMethod
            name="schedule"
            signature="(at: number, taskId: string, taskName: string, params?: any)"
            description="Schedule a task to run at a future time (Unix timestamp)."
          />
          <ApiMethod
            name="checkpoint"
            signature="(taskId: string, key: string, value: any)"
            description="Save progress for a task. Use this to mark completion of expensive operations."
          />
          <ApiMethod
            name="getCheckpoint"
            signature="(taskId: string, key: string)"
            description="Retrieve saved progress for a task. Returns undefined if not found."
          />
          <ApiMethod
            name="completeTask"
            signature="(taskId: string)"
            description="Mark a task as complete and clean up its state."
          />
          <ApiMethod
            name="alarm"
            signature="()"
            description="Call this from your Durable Object's alarm handler to process scheduled tasks."
          />
        </div>
      </div>
    </section>

    <!-- Interactive Demo -->
    <section id="demo" class="py-16 border-b border-zinc-800/50">
      <h2 class="text-2xl font-semibold mb-2">Interactive Demo</h2>
      <p class="text-sm text-zinc-500 mb-8">
        Start a simulated long-running task and watch the checkpoint system in
        action.
      </p>
      <InteractiveDemo />
    </section>

    <!-- Mining Game CTA -->
    <section class="py-16 border-b border-zinc-800/50">
      <div class="flex justify-center">
        <a
          href="/mission"
          class="group relative flex items-center justify-center transition-transform w-full max-w-2xl bg-zinc-900/50 border-2 border-orange-500/50 hover:border-orange-400 rounded-xl overflow-hidden"
        >
          <div
            class="relative overflow-hidden p-6 w-full flex items-center justify-center gap-6"
          >
            <img
              src="/mining-game.png"
              alt="Mining Game"
              class="w-32 h-32 object-contain"
            />
            <div class="text-left">
              <div class="text-lg font-semibold text-zinc-100 mb-1">
                Tired of boring developer docs?
              </div>
              <div class="text-sm text-zinc-400">
                Try <code
                  class="font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-orange-400"
                  >the Mining Game</code
                > — a fun interactive demo powered by ironalarm
              </div>
            </div>
            <div
              class="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
            ></div>
          </div>
        </a>
      </div>
    </section>

    <!-- Design Principles -->
    <section class="py-16">
      <h2 class="text-2xl font-semibold mb-6">Design</h2>
      <div class="grid sm:grid-cols-2 gap-4">
        {#each [{ title: "Eviction safety", desc: "30s safety alarm retries if evicted" }, { title: "Checkpoints", desc: "Skip already-done work on resume" }, { title: "Named handlers", desc: "No function serialization needed" }, { title: "Single queue", desc: "One alarm drives all tasks" }] as item}
          <div class="flex items-start gap-3 p-4">
            <span class="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-2"></span>
            <div>
              <span class="text-sm text-zinc-300">{item.title}:</span>
              <span class="text-sm text-zinc-500 ml-1">{item.desc}</span>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-8 border-t border-zinc-800/50 text-center">
      <p class="text-xs text-zinc-600">
        Built for Cloudflare Durable Objects. <a
          href="https://github.com/acoyfellow/ironalarm"
          class="text-zinc-500 hover:text-zinc-400 transition-colors"
          >View on GitHub</a
        >
      </p>
    </footer>
  </div>
</div>
