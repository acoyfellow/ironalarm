import { h as spread_props, ad as head, k as ensure_array_like, m as escape_html } from "../../../chunks/async.js";
import "../../../chunks/button.js";
import { C as CodeBlock } from "../../../chunks/CodeBlock.js";
import { I as Icon } from "../../../chunks/Icon.js";
function Zap($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "path",
        {
          "d": "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
        }
      ]
    ];
    Icon($$renderer2, spread_props([
      { name: "zap" },
      /**
       * @component @name Zap
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNCAxNGExIDEgMCAwIDEtLjc4LTEuNjNsOS45LTEwLjJhLjUuNSAwIDAgMSAuODYuNDZsLTEuOTIgNi4wMkExIDEgMCAwIDAgMTMgMTBoN2ExIDEgMCAwIDEgLjc4IDEuNjNsLTkuOSAxMC4yYS41LjUgMCAwIDEtLjg2LS40NmwxLjkyLTYuMDJBMSAxIDAgMCAwIDExIDE0eiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/zap
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function Shield($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "path",
        {
          "d": "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
        }
      ]
    ];
    Icon($$renderer2, spread_props([
      { name: "shield" },
      /**
       * @component @name Shield
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjAgMTNjMCA1LTMuNSA3LjUtNy42NiA4Ljk1YTEgMSAwIDAgMS0uNjctLjAxQzcuNSAyMC41IDQgMTggNCAxM1Y2YTEgMSAwIDAgMSAxLTFjMiAwIDQuNS0xLjIgNi4yNC0yLjcyYTEuMTcgMS4xNyAwIDAgMSAxLjUyIDBDMTQuNTEgMy44MSAxNyA1IDE5IDVhMSAxIDAgMCAxIDEgMXoiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/shield
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function Refresh_cw($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "path",
        { "d": "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }
      ],
      ["path", { "d": "M21 3v5h-5" }],
      [
        "path",
        { "d": "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }
      ],
      ["path", { "d": "M8 16H3v5" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "refresh-cw" },
      /**
       * @component @name RefreshCw
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMyAxMmE5IDkgMCAwIDEgOS05IDkuNzUgOS43NSAwIDAgMSA2Ljc0IDIuNzRMMjEgOCIgLz4KICA8cGF0aCBkPSJNMjEgM3Y1aC01IiAvPgogIDxwYXRoIGQ9Ik0yMSAxMmE5IDkgMCAwIDEtOSA5IDkuNzUgOS43NSAwIDAgMS02Ljc0LTIuNzRMMyAxNiIgLz4KICA8cGF0aCBkPSJNOCAxNkgzdjUiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/refresh-cw
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function Layers($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "path",
        {
          "d": "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"
        }
      ],
      [
        "path",
        {
          "d": "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"
        }
      ],
      [
        "path",
        {
          "d": "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"
        }
      ]
    ];
    Icon($$renderer2, spread_props([
      { name: "layers" },
      /**
       * @component @name Layers
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIuODMgMi4xOGEyIDIgMCAwIDAtMS42NiAwTDIuNiA2LjA4YTEgMSAwIDAgMCAwIDEuODNsOC41OCAzLjkxYTIgMiAwIDAgMCAxLjY2IDBsOC41OC0zLjlhMSAxIDAgMCAwIDAtMS44M3oiIC8+CiAgPHBhdGggZD0iTTIgMTJhMSAxIDAgMCAwIC41OC45MWw4LjYgMy45MWEyIDIgMCAwIDAgMS42NSAwbDguNTgtMy45QTEgMSAwIDAgMCAyMiAxMiIgLz4KICA8cGF0aCBkPSJNMiAxN2ExIDEgMCAwIDAgLjU4LjkxbDguNiAzLjkxYTIgMiAwIDAgMCAxLjY1IDBsOC41OC0zLjlBMSAxIDAgMCAwIDIyIDE3IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/layers
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function _page($$renderer) {
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
      description: "30-second safety alarm automatically retries tasks if your DO gets evicted mid-execution."
    },
    {
      icon: Refresh_cw,
      title: "Checkpoints",
      description: "Save progress at key points. On retry, skip already-completed work for true resumability."
    },
    {
      icon: Layers,
      title: "Named Handlers",
      description: "Register handlers by name (string) - no function serialization issues."
    },
    {
      icon: Zap,
      title: "Single Queue",
      description: "One alarm drives all tasks. Reliable, sequential execution from a unified queue."
    }
  ];
  head("1xmjmrw", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>Documentation - ironalarm</title>`);
    });
  });
  $$renderer.push(`<div class="min-h-screen"><div class="max-w-5xl mx-auto px-6 py-16"><div class="text-center mb-16"><h1 class="text-4xl font-bold mb-4 tracking-tight text-zinc-100">Documentation</h1> <p class="text-xl text-zinc-500 max-w-2xl mx-auto">Reliable task scheduling for Cloudflare Durable Objects. Handle
        evictions gracefully with automatic retries and checkpoints.</p></div> <section class="mb-16"><div class="flex items-center gap-3 mb-6"><div class="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold">1</div> <h2 class="text-2xl font-semibold text-zinc-100">Install</h2></div> `);
  CodeBlock($$renderer, { code: installCode, lang: "bash" });
  $$renderer.push(`<!----></section> <section class="mb-16"><div class="flex items-center gap-3 mb-6"><div class="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold">2</div> <h2 class="text-2xl font-semibold text-zinc-100">Basic Setup</h2></div> `);
  CodeBlock($$renderer, { code: basicSetupCode, lang: "typescript" });
  $$renderer.push(`<!----></section> <section class="mb-16"><h2 class="text-2xl font-semibold mb-6 text-zinc-100">Core Concepts</h2> <div class="grid md:grid-cols-2 gap-4"><!--[-->`);
  const each_array = ensure_array_like(concepts);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let concept = each_array[$$index];
    $$renderer.push(`<div class="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/30 hover:border-orange-500/50 transition-colors"><div class="flex items-start gap-4"><div class="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">`);
    concept.icon($$renderer, { class: "w-5 h-5 text-orange-400" });
    $$renderer.push(`<!----></div> <div><h3 class="font-semibold mb-1 text-zinc-200">${escape_html(concept.title)}</h3> <p class="text-sm text-zinc-500 leading-relaxed">${escape_html(concept.description)}</p></div></div></div>`);
  }
  $$renderer.push(`<!--]--></div></section> <section class="mb-16"><div class="flex items-center gap-3 mb-6"><div class="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold">3</div> <h2 class="text-2xl font-semibold text-zinc-100">Multi-step Tasks</h2></div> <p class="text-zinc-500 mb-4">Use <code class="font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-sm text-zinc-300">runSteps()</code> for tasks with multiple stages. Progress is automatically tracked and resumable.</p> `);
  CodeBlock($$renderer, { code: multiStepCode, lang: "typescript" });
  $$renderer.push(`<!----></section> <section class="mb-16"><div class="flex items-center gap-3 mb-6"><div class="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold">`);
  Refresh_cw($$renderer, { class: "w-4 h-4" });
  $$renderer.push(`<!----></div> <h2 class="text-2xl font-semibold">Infinite Loop Tasks</h2></div> <p class="text-zinc-500 mb-4">For background processors, game loops, or any task that runs forever.
        Use <code class="font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-sm text-zinc-300">maxRetries: Infinity</code> to survive DO restarts.</p> `);
  CodeBlock($$renderer, { code: infiniteLoopCode, lang: "typescript" });
  $$renderer.push(`<!----> <div class="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"><p class="text-sm text-amber-400"><strong>Note:</strong> After a DO restart, Effect generators don't
          auto-resume. You need to manually restart infinite loop tasks in your
          constructor. See the <a href="/docs/api" class="underline hover:text-amber-300 text-amber-400">API reference</a> for the full pattern.</p></div></section> <section class="text-center py-12 border-t border-dashed border-zinc-800/50"><h2 class="text-xl font-semibold mb-4 text-zinc-100">Ready to dive deeper?</h2> <div class="flex justify-center gap-4"><a href="/docs/api" class="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-medium text-sm rounded-lg transition-all">API Reference</a> <a href="#demo" class="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm rounded-lg transition-all border border-zinc-700">Try the Demo</a></div></section></div></div>`);
}
export {
  _page as default
};
