import { j as attr, m as escape_html, l as attr_class, k as ensure_array_like, n as stringify, z as attr_style, ad as head } from "../../chunks/async.js";
import { o as onDestroy } from "../../chunks/index-server.js";
import "../../chunks/data.remote.js";
import { C as CodeBlock } from "../../chunks/CodeBlock.js";
import "clsx";
function InteractiveDemo($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let inputValue = "AI agents";
    let selectedDuration = 60;
    let isStarting = false;
    let tasks = [];
    let now = Date.now();
    const durationOptions = [
      { label: "1 second", value: 1 },
      { label: "10 seconds", value: 10 },
      { label: "Demo (60s)", value: 60 },
      { label: "Realistic (1 hour)", value: 3600 },
      { label: "Production (1 week)", value: 604800 },
      { label: "1 Month", value: 2592e3 },
      { label: "1 Year", value: 31536e3 }
    ];
    const selectedLabel = durationOptions.find((d) => d.value === selectedDuration)?.label || "Demo (60s)";
    onDestroy(() => {
    });
    function formatDuration(seconds) {
      if (seconds < 60) return `${seconds}s`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
      return `${Math.floor(seconds / 86400)}d ${Math.floor(seconds % 86400 / 3600)}h`;
    }
    function formatElapsed(startedAt, pausedAt, totalPausedMs = 0, status, completedAt) {
      const currentTime = status === "completed" && completedAt ? completedAt : now;
      if (pausedAt) {
        return Math.floor((pausedAt - startedAt - totalPausedMs) / 1e3);
      }
      return Math.floor((currentTime - startedAt - totalPausedMs) / 1e3);
    }
    $$renderer2.push(`<div class="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl mb-6"><div class="flex items-center gap-2 mb-4"><svg class="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round"${attr("stroke-width", 2)} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg> <span class="text-sm font-medium text-zinc-300">Start a Task</span></div> <div class="flex flex-col sm:flex-row gap-3"><input type="text"${attr("value", inputValue)} placeholder="Task name..." class="flex-1 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 font-mono transition-all"/> <div class="relative"><button class="w-full sm:w-48 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-300 text-left flex items-center justify-between hover:border-zinc-700 transition-colors"><span class="font-mono">${escape_html(selectedLabel)}</span> <svg${attr_class(`w-4 h-4 text-zinc-500 transition-transform ${stringify("")}`)} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round"${attr("stroke-width", 2)} d="M19 9l-7 7-7-7"></path></svg></button> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <button${attr("disabled", isStarting, true)} class="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`Start <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round"${attr("stroke-width", 2)} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg>`);
    }
    $$renderer2.push(`<!--]--></button></div> <p class="mt-3 text-xs text-zinc-600">Simulates a long-running agent task with checkpoints: <code class="text-zinc-500">research</code> → <code class="text-zinc-500">analysis</code> → <code class="text-zinc-500">synthesis</code> → <code class="text-zinc-500">writeup</code></p></div> <div class="bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden"><div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50"><h3 class="text-sm font-medium text-zinc-300">Running Tasks</h3> <div class="flex items-center gap-3 text-xs text-zinc-600"><span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ${escape_html(tasks.filter((t) => t.status === "completed").length)} completed</span> <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> ${escape_html(tasks.filter((t) => t.status === "running").length)} running</span></div></div> <div class="p-4 space-y-3">`);
    if (tasks.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-sm text-zinc-600 text-center py-8">No tasks yet. Start one above to see the scheduler in action!</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<!--[-->`);
      const each_array_1 = ensure_array_like(tasks);
      for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
        let task = each_array_1[$$index_2];
        const elapsedSeconds = task.startedAt ? formatElapsed(task.startedAt, task.pausedAt, task.totalPausedMs || 0, task.status, task.completedAt) : 0;
        const duration = task.duration || (task.progress?.totalSteps ? task.progress.totalSteps * 15 : 60);
        const checkpoints = task.progress?.checkpoints || task.progress?.completedSteps || [];
        $$renderer2.push(`<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"><div class="flex items-start justify-between mb-3"><div><code class="text-sm text-zinc-300 font-mono">${escape_html(task.taskId)}</code> <div class="flex items-center gap-2 mt-1"><span class="text-xs text-zinc-600">${escape_html(formatDuration(elapsedSeconds))} / ${escape_html(formatDuration(duration))}</span></div></div> <span${attr_class(`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase tracking-wide border rounded-md ${stringify(task.status === "completed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : task.status === "running" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/20")}`)}>`);
        if (task.status === "running") {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span class="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (task.status === "completed") {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> ${escape_html(task.status)}</span></div> <div class="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-3"><div class="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"${attr_style(`width: ${stringify(Math.min(elapsedSeconds / duration * 100, 100))}%`)}></div></div> <div class="flex items-center gap-1"><!--[-->`);
        const each_array_2 = ensure_array_like(["research", "analysis", "synthesis", "writeup"]);
        for (let i = 0, $$length2 = each_array_2.length; i < $$length2; i++) {
          let step = each_array_2[i];
          $$renderer2.push(`<span${attr_class(`text-xs font-mono ${stringify(checkpoints.includes(step) ? "text-emerald-400" : "text-zinc-600")}`)}>${escape_html(step)}</span> `);
          if (i < 3) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<span class="text-zinc-700 text-xs">→</span>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]--></div></div>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
function ApiMethod($$renderer, $$props) {
  let { name, signature, description } = $$props;
  $$renderer.push(`<div class="py-4 border-b border-zinc-800/50 last:border-0"><code class="text-sm text-orange-400 font-mono">${escape_html(name)}</code> <code class="text-sm text-zinc-500 font-mono ml-1">${escape_html(signature)}</code> <p class="text-sm text-zinc-500 mt-1">${escape_html(description)}</p></div>`);
}
function _page($$renderer) {
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
  head("1uha8ag", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>ironalarm - Reliable task scheduling for Cloudflare Durable Objects</title>`);
    });
  });
  $$renderer.push(`<div class="relative"><div class="fixed inset-0 overflow-hidden pointer-events-none"><div class="absolute -top-40 -right-40 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl"></div> <div class="absolute top-1/2 -left-40 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl"></div></div> <div class="relative max-w-5xl mx-auto px-6"><section class="py-20 border-b border-zinc-800/50"><div class="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-400 mb-6"><span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Now with checkpoint recovery</div> <h1 class="text-4xl md:text-5xl font-semibold tracking-tight mb-4">Reliable task scheduling for<br/> <span class="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">Cloudflare Durable Objects</span></h1> <p class="text-lg text-zinc-500 max-w-2xl mb-8">The "reliable runNow" pattern for resilient long-running tasks with
        automatic checkpoint recovery. Never lose progress to eviction again.</p> <div class="flex items-center gap-4 flex-wrap"><div class="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm"><span class="text-zinc-500">$</span> <span class="text-zinc-300">bun install ironalarm</span> <button class="ml-2 text-zinc-600 hover:text-zinc-400 transition-colors" aria-label="Copy install command"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round"${attr("stroke-width", 2)} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button></div> <a href="#demo" class="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-medium text-sm rounded-lg transition-all">Try the demo</a></div></section> <section id="docs" class="py-16 border-b border-zinc-800/50"><h2 class="text-2xl font-semibold mb-4">The Problem</h2> <p class="text-zinc-400 max-w-3xl">Cloudflare Durable Objects can evict your code after ~144 seconds of
        inactivity. For long-running operations (like AI agent loops), a single
        eviction mid-task breaks your workflow.</p> <p class="text-zinc-400 max-w-3xl mt-4"><span class="text-zinc-200">ironalarm</span> solves this with a lightweight,
        userspace implementation that persists task state and uses a 30-second safety
        alarm net—if evicted, the task automatically retries and resumes from checkpoints.</p></section> <section class="py-16 border-b border-zinc-800/50"><h2 class="text-2xl font-semibold mb-8">Features</h2> <div class="grid md:grid-cols-2 gap-4"><!--[-->`);
  const each_array = ensure_array_like([
    {
      title: "Reliable execution",
      desc: "runNow() starts immediately with 30s safety alarm for eviction recovery"
    },
    {
      title: "Checkpoints",
      desc: "User-managed progress tracking for resumable work after evictions"
    },
    {
      title: "Named handlers",
      desc: "Register task handlers by name—no function serialization required"
    },
    {
      title: "Minimal",
      desc: "~300 LOC, zero dependencies, fully serializable tasks"
    }
  ]);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let f = each_array[$$index];
    $$renderer.push(`<div class="p-5 bg-zinc-900/30 border border-zinc-800/50 rounded-xl"><h3 class="text-sm font-medium text-zinc-200 mb-1">${escape_html(f.title)}</h3> <p class="text-sm text-zinc-500">${escape_html(f.desc)}</p></div>`);
  }
  $$renderer.push(`<!--]--></div></section> <section class="py-16 border-b border-zinc-800/50"><h2 class="text-2xl font-semibold mb-6">Quick Start</h2> `);
  CodeBlock($$renderer, { code: quickStartCode, lang: "typescript" });
  $$renderer.push(`<!----></section> <section id="api" class="py-16 border-b border-zinc-800/50"><h2 class="text-2xl font-semibold mb-2">API Reference</h2> <p class="text-sm text-zinc-500 mb-8">All methods available on the ReliableScheduler class.</p> <div class="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6"><div class="mb-6 pb-6 border-b border-zinc-800/50"><h3 class="text-sm font-medium text-zinc-300 mb-2">Constructor</h3> <code class="text-sm font-mono"><span class="text-purple-400">new</span> <span class="text-orange-400">ReliableScheduler</span>(<span class="text-zinc-400">storage: DurableObjectStorage</span>)</code> <p class="text-sm text-zinc-500 mt-2">Creates a new scheduler instance with the provided Durable Object
            storage.</p></div> <h3 class="text-sm font-medium text-zinc-300 mb-4">Methods</h3> <div class="space-y-0 divide-y divide-zinc-800/50">`);
  ApiMethod($$renderer, {
    name: "register",
    signature: "(taskName: string, handler: Function)",
    description: "Register a named task handler. The handler receives the scheduler, taskId, and params."
  });
  $$renderer.push(`<!----> `);
  ApiMethod($$renderer, {
    name: "runNow",
    signature: "(taskId: string, taskName: string, params?: any)",
    description: "Start a task immediately with eviction safety. Sets a 30s safety alarm for automatic retry."
  });
  $$renderer.push(`<!----> `);
  ApiMethod($$renderer, {
    name: "schedule",
    signature: "(at: number, taskId: string, taskName: string, params?: any)",
    description: "Schedule a task to run at a future time (Unix timestamp)."
  });
  $$renderer.push(`<!----> `);
  ApiMethod($$renderer, {
    name: "checkpoint",
    signature: "(taskId: string, key: string, value: any)",
    description: "Save progress for a task. Use this to mark completion of expensive operations."
  });
  $$renderer.push(`<!----> `);
  ApiMethod($$renderer, {
    name: "getCheckpoint",
    signature: "(taskId: string, key: string)",
    description: "Retrieve saved progress for a task. Returns undefined if not found."
  });
  $$renderer.push(`<!----> `);
  ApiMethod($$renderer, {
    name: "completeTask",
    signature: "(taskId: string)",
    description: "Mark a task as complete and clean up its state."
  });
  $$renderer.push(`<!----> `);
  ApiMethod($$renderer, {
    name: "alarm",
    signature: "()",
    description: "Call this from your Durable Object's alarm handler to process scheduled tasks."
  });
  $$renderer.push(`<!----></div></div></section> <section id="demo" class="py-16 border-b border-zinc-800/50"><h2 class="text-2xl font-semibold mb-2">Interactive Demo</h2> <p class="text-sm text-zinc-500 mb-8">Start a simulated long-running task and watch the checkpoint system in
        action.</p> `);
  InteractiveDemo($$renderer);
  $$renderer.push(`<!----></section> <section class="py-16 border-b border-zinc-800/50"><div class="flex justify-center"><a href="/mission" class="group relative flex items-center justify-center transition-transform w-full max-w-2xl bg-zinc-900/50 border-2 border-orange-500/50 hover:border-orange-400 rounded-xl overflow-hidden"><div class="relative overflow-hidden p-6 w-full flex items-center justify-center gap-6"><img src="/mining-game.png" alt="Mining Game" class="w-32 h-32 object-contain"/> <div class="text-left"><div class="text-lg font-semibold text-zinc-100 mb-1">Tired of boring developer docs?</div> <div class="text-sm text-zinc-400">Try <code class="font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-orange-400">the Mining Game</code> — a fun interactive demo powered by ironalarm</div></div> <div class="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div></div></a></div></section> <section class="py-16"><h2 class="text-2xl font-semibold mb-6">Design</h2> <div class="grid sm:grid-cols-2 gap-4"><!--[-->`);
  const each_array_1 = ensure_array_like([
    {
      title: "Eviction safety",
      desc: "30s safety alarm retries if evicted"
    },
    {
      title: "Checkpoints",
      desc: "Skip already-done work on resume"
    },
    {
      title: "Named handlers",
      desc: "No function serialization needed"
    },
    { title: "Single queue", desc: "One alarm drives all tasks" }
  ]);
  for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
    let item = each_array_1[$$index_1];
    $$renderer.push(`<div class="flex items-start gap-3 p-4"><span class="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-2"></span> <div><span class="text-sm text-zinc-300">${escape_html(item.title)}:</span> <span class="text-sm text-zinc-500 ml-1">${escape_html(item.desc)}</span></div></div>`);
  }
  $$renderer.push(`<!--]--></div></section> <footer class="py-8 border-t border-zinc-800/50 text-center"><p class="text-xs text-zinc-600">Built for Cloudflare Durable Objects. <a href="https://github.com/acoyfellow/ironalarm" class="text-zinc-500 hover:text-zinc-400 transition-colors">View on GitHub</a></p></footer></div></div>`);
}
export {
  _page as default
};
