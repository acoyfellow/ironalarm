<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import CodeBlock from "$lib/components/CodeBlock.svelte";
  import Zap from "@lucide/svelte/icons/zap";
  import Shield from "@lucide/svelte/icons/shield";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import Layers from "@lucide/svelte/icons/layers";

  const installCode = `bun add ironalarm`;

  const basicSetupCode = `import { ReliableScheduler } from 'ironalarm';
import { DurableObject } from 'cloudflare:workers';
import { Effect } from 'effect';

export class MyDO extends DurableObject {
  private scheduler: ReliableScheduler;

  constructor(ctx: any, env: any) {
    super(ctx, env);
    this.scheduler = new ReliableScheduler(this.ctx.storage);

    // Register a task handler
    this.scheduler.register('my-task', (sched, taskId, params) =>
      Effect.gen(function* () {
        // Check if already started (for resume after eviction)
        const started = yield* Effect.promise(() => 
          sched.getCheckpoint(taskId, 'started')
        );
        
        if (!started) {
          yield* Effect.promise(() => doExpensiveWork(params));
          yield* Effect.promise(() => 
            sched.checkpoint(taskId, 'started', true)
          );
        }
        
        yield* Effect.promise(() => sched.completeTask(taskId));
      })
    );
  }

  async alarm() {
    await this.scheduler.alarm();
  }

  async startTask(params: any) {
    const taskId = ReliableScheduler.generateTaskId();
    await this.scheduler.runNow(taskId, 'my-task', params);
    return taskId;
  }
}`;

  const multiStepCode = `this.scheduler.register('agent-loop', (sched, taskId, params) =>
  Effect.gen(function* () {
    yield* Effect.promise(() =>
      sched.runSteps(taskId, [
        'researching',
        'analyzing', 
        'synthesizing',
        'writing',
        'finalizing'
      ], {
        stepDuration: 2000,
        autoComplete: true,
        onStep: async (stepName, stepIndex) => {
          console.log(\`Step \${stepIndex + 1}: \${stepName}\`);
          // Your step logic here
        }
      })
    );
  })
);`;

  const infiniteLoopCode = `// Register an infinite loop handler
this.scheduler.register('mining-loop', (sched, taskId, params) =>
  Effect.gen(function* () {
    while (true) {
      const task = yield* Effect.promise(() => sched.getTask(taskId));
      if (!task || task.status === 'paused') return;

      // Do work each iteration
      yield* Effect.promise(() => mineResources(params));
      
      // Update cycle counter
      const cycle = (yield* Effect.promise(() => 
        sched.getCheckpoint(taskId, 'cycle')
      ) || 0) as number;
      yield* Effect.promise(() => 
        sched.checkpoint(taskId, 'cycle', cycle + 1)
      );

      // Wait before next iteration
      yield* Effect.promise(() => 
        new Promise(r => setTimeout(r, 5000))
      );
    }
  })
);

// Start with infinite retries (survives DO restarts)
await this.scheduler.runNow(
  taskId, 
  'mining-loop', 
  params, 
  { maxRetries: Infinity }
);`;

  const concepts = [
    {
      icon: Shield,
      title: "Eviction Safety",
      description:
        "30-second safety alarm automatically retries tasks if your DO gets evicted mid-execution.",
    },
    {
      icon: RefreshCw,
      title: "Checkpoints",
      description:
        "Save progress at key points. On retry, skip already-completed work for true resumability.",
    },
    {
      icon: Layers,
      title: "Named Handlers",
      description:
        "Register handlers by name (string) - no function serialization issues.",
    },
    {
      icon: Zap,
      title: "Single Queue",
      description:
        "One alarm drives all tasks. Reliable, sequential execution from a unified queue.",
    },
  ];
</script>

<svelte:head>
  <title>Documentation - ironalarm</title>
</svelte:head>

<div class="min-h-screen">
  <div class="max-w-5xl mx-auto px-6 py-16">
    <!-- Header -->
    <div class="text-center mb-16">
      <h1 class="text-4xl font-bold mb-4 tracking-tight text-zinc-100">Documentation</h1>
      <p class="text-xl text-zinc-500 max-w-2xl mx-auto">
        Reliable task scheduling for Cloudflare Durable Objects. Handle
        evictions gracefully with automatic retries and checkpoints.
      </p>
    </div>

    <!-- Install -->
    <section class="mb-16">
      <div class="flex items-center gap-3 mb-6">
        <div
          class="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold"
        >
          1
        </div>
        <h2 class="text-2xl font-semibold text-zinc-100">Install</h2>
      </div>
      <CodeBlock code={installCode} lang="bash" />
    </section>

    <!-- Basic Setup -->
    <section class="mb-16">
      <div class="flex items-center gap-3 mb-6">
        <div
          class="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold"
        >
          2
        </div>
        <h2 class="text-2xl font-semibold text-zinc-100">Basic Setup</h2>
      </div>
      <CodeBlock code={basicSetupCode} lang="typescript" />
    </section>

    <!-- Core Concepts -->
    <section class="mb-16">
      <h2 class="text-2xl font-semibold mb-6 text-zinc-100">Core Concepts</h2>
      <div class="grid md:grid-cols-2 gap-4">
        {#each concepts as concept}
          <div
            class="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/30 hover:border-orange-500/50 transition-colors"
          >
            <div class="flex items-start gap-4">
              <div
                class="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0"
              >
                <concept.icon class="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 class="font-semibold mb-1 text-zinc-200">{concept.title}</h3>
                <p class="text-sm text-zinc-500 leading-relaxed">
                  {concept.description}
                </p>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- Multi-step Tasks -->
    <section class="mb-16">
      <div class="flex items-center gap-3 mb-6">
        <div
          class="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold"
        >
          3
        </div>
        <h2 class="text-2xl font-semibold text-zinc-100">Multi-step Tasks</h2>
      </div>
      <p class="text-zinc-500 mb-4">
        Use <code class="font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-sm text-zinc-300"
          >runSteps()</code
        > for tasks with multiple stages. Progress is automatically tracked and resumable.
      </p>
      <CodeBlock code={multiStepCode} lang="typescript" />
    </section>

    <!-- Infinite Loop Tasks -->
    <section class="mb-16">
      <div class="flex items-center gap-3 mb-6">
        <div
          class="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold"
        >
          <RefreshCw class="w-4 h-4" />
        </div>
        <h2 class="text-2xl font-semibold">Infinite Loop Tasks</h2>
      </div>
      <p class="text-zinc-500 mb-4">
        For background processors, game loops, or any task that runs forever.
        Use <code class="font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-sm text-zinc-300"
          >maxRetries: Infinity</code
        > to survive DO restarts.
      </p>
      <CodeBlock code={infiniteLoopCode} lang="typescript" />
      <div
        class="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
      >
        <p class="text-sm text-amber-400">
          <strong>Note:</strong> After a DO restart, Effect generators don't
          auto-resume. You need to manually restart infinite loop tasks in your
          constructor. See the
          <a href="/docs/api" class="underline hover:text-amber-300 text-amber-400"
            >API reference</a
          > for the full pattern.
        </p>
      </div>
    </section>

    <!-- Next Steps -->
    <section
      class="text-center py-12 border-t border-dashed border-zinc-800/50"
    >
      <h2 class="text-xl font-semibold mb-4 text-zinc-100">Ready to dive deeper?</h2>
      <div class="flex justify-center gap-4">
        <a href="/docs/api" class="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-medium text-sm rounded-lg transition-all">
          API Reference
        </a>
        <a href="#demo" class="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm rounded-lg transition-all border border-zinc-700">
          Try the Demo
        </a>
      </div>
    </section>
  </div>
</div>
