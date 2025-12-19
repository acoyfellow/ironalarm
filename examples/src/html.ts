export function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ironalarm - Reliable task scheduling for Cloudflare Durable Objects</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-white">
  <header class="border-b border-black/10">
    <div class="container mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-8">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-black">
              <path d="m7.5 4.27 9 5.15"></path>
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
              <path d="m3.3 7 8.7 5 8.7-5"></path>
              <path d="M12 22V12"></path>
            </svg>
            <span class="font-mono text-lg font-semibold text-black">ironalarm</span>
          </div>
          <nav class="hidden md:flex items-center gap-6 text-sm text-black/60">
            <a href="#docs" class="hover:text-black transition-colors">Docs</a>
            <a href="#api" class="hover:text-black transition-colors">API</a>
            <a href="#demo" class="hover:text-black transition-colors">Demo</a>
          </nav>
        </div>
        <div class="flex items-center gap-3">
          <a href="https://github.com/acoyfellow/ironalarm" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 h-8 rounded-md px-3 gap-2 text-black hover:bg-black/5">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
              <path d="M9 18c-4.51 2-5-2-7-2"></path>
            </svg>
            <span class="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </div>
  </header>

  <div class="container mx-auto px-6 py-16 lg:py-20">
    <div class="max-w-4xl mx-auto text-center space-y-6">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 border border-black/10 text-black text-sm font-mono mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3">
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" x2="20" y1="19" y2="19"></line>
        </svg>
        npm install ironalarm
      </div>
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance text-black">Reliable task scheduling for Cloudflare Durable Objects</h1>
      <p class="text-lg sm:text-xl text-black/60 text-balance max-w-2xl mx-auto leading-relaxed">Implementing the "reliable runNow" pattern for resilient long-running tasks with automatic checkpoint recovery.</p>
    </div>

    <div class="max-w-4xl mx-auto mt-16 space-y-6">
      <div class="text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm p-8 bg-white border-black/10">
        <h2 class="text-2xl font-semibold text-black mb-4">Problem</h2>
        <p class="text-black/80 leading-relaxed">Cloudflare Durable Objects can evict your code after ~144 seconds of inactivity. For long-running operations (like AI agent loops), a single eviction mid-task breaks your workflow. <span class="font-semibold">ironalarm</span> solves this with a lightweight, userspace implementation that persists task state and uses a 30-second safety alarm net—if evicted, the task automatically retries and resumes from checkpoints.</p>
      </div>
    </div>

    <div id="docs" class="max-w-4xl mx-auto mt-12 space-y-6">
      <h2 class="text-2xl font-semibold text-black">Features</h2>
      <div class="grid sm:grid-cols-2 gap-4">
        <div class="text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm p-6 bg-white border-black/10">
          <div class="flex items-start gap-3">
            <div class="h-8 w-8 rounded-md bg-black/5 flex items-center justify-center flex-shrink-0 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-black">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-black mb-1">Reliable execution</h3>
              <p class="text-sm text-black/60 leading-relaxed"><span class="font-mono text-xs bg-black/5 px-1 py-0.5 rounded">runNow()</span> starts immediately with 30s safety alarm for eviction recovery</p>
            </div>
          </div>
        </div>
        <div class="text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm p-6 bg-white border-black/10">
          <div class="flex items-start gap-3">
            <div class="h-8 w-8 rounded-md bg-black/5 flex items-center justify-center flex-shrink-0 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-black">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-black mb-1">Checkpoints</h3>
              <p class="text-sm text-black/60 leading-relaxed">User-managed progress tracking for resumable work after evictions</p>
            </div>
          </div>
        </div>
        <div class="text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm p-6 bg-white border-black/10">
          <div class="flex items-start gap-3">
            <div class="h-8 w-8 rounded-md bg-black/5 flex items-center justify-center flex-shrink-0 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-black">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-black mb-1">Named handlers</h3>
              <p class="text-sm text-black/60 leading-relaxed">Register task handlers by name—no function serialization required</p>
            </div>
          </div>
        </div>
        <div class="text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm p-6 bg-white border-black/10">
          <div class="flex items-start gap-3">
            <div class="h-8 w-8 rounded-md bg-black/5 flex items-center justify-center flex-shrink-0 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-black">
                <path d="m7.5 4.27 9 5.15"></path>
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
                <path d="m3.3 7 8.7 5 8.7-5"></path>
                <path d="M12 22V12"></path>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-black mb-1">Minimal</h3>
              <p class="text-sm text-black/60 leading-relaxed">~300 LOC, zero dependencies, fully serializable tasks</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto mt-12 space-y-6">
      <h2 class="text-2xl font-semibold text-black">Quick Start</h2>
      <div class="text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm p-6 bg-black/[0.02] border-black/10">
        <pre class="text-sm text-black overflow-x-auto"><code>import { ReliableScheduler } from 'ironalarm';

export class MyDO {
  private scheduler: ReliableScheduler;

  constructor(state: DurableObjectState, env: any) {
    this.scheduler = new ReliableScheduler(state.storage);

    this.scheduler.register('my-task', async (sched, taskId, params) => {
      if (!await sched.getCheckpoint(taskId, 'started')) {
        await doWork(params);
        await sched.checkpoint(taskId, 'started', true);
      }
      await expensiveOperation();
      await sched.completeTask(taskId);
    });
  }

  async alarm() {
    await this.scheduler.alarm();
  }

  async startTask(params: any) {
    const taskId = crypto.randomUUID();
    await this.scheduler.runNow(taskId, 'my-task', params);
  }
}</code></pre>
      </div>
    </div>

    <div id="api" class="max-w-4xl mx-auto mt-12 space-y-6">
      <h2 class="text-2xl font-semibold text-black">API Reference</h2>
      <div class="text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm p-6 bg-white border-black/10">
        <h3 class="text-lg font-semibold text-black mb-4">Constructor</h3>
        <div class="space-y-4">
          <div>
            <p class="font-mono text-sm text-black mb-2">new ReliableScheduler(storage: DurableObjectStorage)</p>
            <p class="text-sm text-black/60">Creates a new scheduler instance with the provided Durable Object storage.</p>
          </div>
        </div>
      </div>
      <div class="text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm p-6 bg-white border-black/10">
        <h3 class="text-lg font-semibold text-black mb-4">Methods</h3>
        <div class="space-y-6">
          <div class="border-l-2 border-black/10 pl-4">
            <p class="font-mono text-sm text-black mb-2">register(taskName: string, handler: Function)</p>
            <p class="text-sm text-black/60">Register a named task handler. The handler receives the scheduler, taskId, and params.</p>
          </div>
          <div class="border-l-2 border-black/10 pl-4">
            <p class="font-mono text-sm text-black mb-2">runNow(taskId: string, taskName: string, params?: any)</p>
            <p class="text-sm text-black/60">Start a task immediately with eviction safety. Sets a 30s safety alarm for automatic retry.</p>
          </div>
          <div class="border-l-2 border-black/10 pl-4">
            <p class="font-mono text-sm text-black mb-2">schedule(at: number, taskId: string, taskName: string, params?: any)</p>
            <p class="text-sm text-black/60">Schedule a task to run at a future time (Unix timestamp).</p>
          </div>
          <div class="border-l-2 border-black/10 pl-4">
            <p class="font-mono text-sm text-black mb-2">checkpoint(taskId: string, key: string, value: any)</p>
            <p class="text-sm text-black/60">Save progress for a task. Use this to mark completion of expensive operations.</p>
          </div>
          <div class="border-l-2 border-black/10 pl-4">
            <p class="font-mono text-sm text-black mb-2">getCheckpoint(taskId: string, key: string)</p>
            <p class="text-sm text-black/60">Retrieve saved progress for a task. Returns undefined if not found.</p>
          </div>
          <div class="border-l-2 border-black/10 pl-4">
            <p class="font-mono text-sm text-black mb-2">completeTask(taskId: string)</p>
            <p class="text-sm text-black/60">Mark a task as complete and clean up its state.</p>
          </div>
          <div class="border-l-2 border-black/10 pl-4">
            <p class="font-mono text-sm text-black mb-2">alarm()</p>
            <p class="text-sm text-black/60">Call this from your Durable Object's alarm handler to process scheduled tasks.</p>
          </div>
        </div>
      </div>
    </div>

    <div id="demo" class="max-w-4xl mx-auto mt-12 space-y-6">
      <h2 class="text-2xl font-semibold text-black">Interactive Demo</h2>
      <div class="text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm p-6 bg-white border-black/10">
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-black">
              <polygon points="6 3 20 12 6 21 6 3"></polygon>
            </svg>
            <h3 class="text-lg font-semibold text-black">Start a Task</h3>
          </div>
          <div class="flex gap-3 flex-wrap">
            <input id="topicInput" class="h-9 flex-1 min-w-[200px] rounded-md border px-3 py-1 text-base shadow-sm transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-black/40 focus-visible:ring-black/20 focus-visible:ring-[3px] bg-white border-black/20 text-black placeholder:text-black/40" placeholder="Enter task description..." value="AI agents">
            <select id="complexityInput" class="h-9 rounded-md border px-3 py-1 text-base shadow-sm transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-black/40 focus-visible:ring-black/20 focus-visible:ring-[3px] bg-white border-black/20 text-black">
              <option value="1s">1 second</option>
              <option value="10s">10 seconds</option>
              <option value="demo">Demo (60s)</option>
              <option value="realistic">Realistic (1 hour)</option>
              <option value="production">Production (1 week)</option>
              <option value="month">1 Month</option>
              <option value="year">1 Year</option>
            </select>
            <button onclick="startTask()" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 h-9 py-2 bg-black text-white hover:bg-black/90 px-6 gap-2">
              Start
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
                <polygon points="6 3 20 12 6 21 6 3"></polygon>
              </svg>
            </button>
          </div>
          <p class="text-sm text-black/60">Simulates a long-running agent task with checkpoints: research → analysis → synthesis → writeup. Set duration from 1 second to 1 year.</p>
        </div>
      </div>
      <div class="text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm p-6 bg-white border-black/10">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-black">Running Tasks <span id="taskCount" class="text-black/60 font-mono text-base"></span></h3>
          </div>
          <div id="tasksList" class="space-y-3">
            <div class="text-center py-8 text-black/60">
              <p>No tasks yet. Start one above to see the scheduler in action!</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto mt-12 pt-8 border-t border-black/10">
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-black">Design</h3>
        <ul class="space-y-2 text-sm text-black/80">
          <li class="flex items-start gap-2">
            <span class="text-black/40 mt-1">•</span>
            <span><span class="font-semibold">Eviction safety:</span> 30s safety alarm retries if evicted</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-black/40 mt-1">•</span>
            <span><span class="font-semibold">Checkpoints:</span> Skip already-done work on resume</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-black/40 mt-1">•</span>
            <span><span class="font-semibold">Named handlers:</span> No function serialization needed</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-black/40 mt-1">•</span>
            <span><span class="font-semibold">Single queue:</span> One alarm drives all tasks</span>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <script>
    let tasks = new Map();
    let pollInterval;

    async function startTask() {
      const topic = document.getElementById('topicInput').value || 'AI agents';
      const complexity = document.getElementById('complexityInput').value || 'demo';
      try {
        const res = await fetch('/task/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskName: 'agent-loop',
            topic,
            complexity,
            context: 'Research and analysis demonstration'
          })
        });
        const data = await res.json();
        console.log('Task started:', data);
        if (!pollInterval) startPolling();
      } catch (err) {
        console.error('Error starting task:', err);
      }
    }

    async function loadTasks() {
      try {
        const res = await fetch('/tasks');
        const taskList = await res.json();
        tasks.clear();
        taskList.forEach(t => tasks.set(t.taskId, t));
        renderTasks();
      } catch (err) {
        console.error('Error loading tasks:', err);
      }
    }

    function renderTasks() {
      const list = document.getElementById('tasksList');
      const count = document.getElementById('taskCount');

      if (tasks.size === 0) {
        list.innerHTML = '<div class="text-center py-8 text-black/60"><p>No tasks yet. Start one above to see the scheduler in action!</p></div>';
        count.textContent = '';
        return;
      }

      count.textContent = \`(\${tasks.size})\`;

      list.innerHTML = Array.from(tasks.values())
        .sort((a, b) => b.startedAt - a.startedAt)
        .map(task => {
          const isComplete = task.status === 'completed';
          const elapsed = ((isComplete ? task.completedAt : Date.now()) - task.startedAt) / 1000;
          const statusBadge = task.status === 'completed' 
            ? '<span class="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 transition-[color,box-shadow] overflow-hidden border-transparent bg-black text-white">COMPLETED</span>'
            : task.status === 'running'
            ? '<span class="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 transition-[color,box-shadow] overflow-hidden border-black/20 bg-black/5 text-black">RUNNING</span>'
            : '<span class="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 transition-[color,box-shadow] overflow-hidden border-black/20 bg-black/5 text-black">PENDING</span>';

          const progress = task.progress || {};
          const step = progress.step || 'pending';
          const result = progress.result || '';
          const complexity = task.complexity || 'demo';
          const complexityLabels = {
            '1s': '1s',
            '10s': '10s',
            demo: '60s',
            realistic: '1 hour',
            production: '1 week',
            month: '1 month',
            year: '1 year'
          };
          const durationLabel = complexityLabels[complexity] || complexity;

          return \`
            <div class="border border-black/10 rounded-lg p-4 bg-black/[0.02] hover:bg-black/[0.04] transition-colors">
              <div class="flex items-start justify-between gap-4 mb-3">
                <div class="flex items-center gap-3">
                  <div class="h-8 w-8 rounded-md bg-black/5 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-black/60">
                      <path d="m7.5 4.27 9 5.15"></path>
                      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
                      <path d="m3.3 7 8.7 5 8.7-5"></path>
                      <path d="M12 22V12"></path>
                    </svg>
                  </div>
                  <div>
                    <p class="font-mono text-sm text-black">\${task.taskId}</p>
                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                      \${statusBadge}
                      <span class="text-xs text-black/60">\${elapsed.toFixed(2)}s</span>
                      <span class="text-xs text-black/40">•</span>
                      <span class="text-xs text-black/60">\${durationLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="pl-11 space-y-1">
                <p class="text-sm"><span class="text-black/60">step:</span> <span class="text-black font-mono">"\${step}"</span></p>
                \${result ? \`<p class="text-sm"><span class="text-black/60">result:</span> <span class="text-black font-mono">"\${result}"</span></p>\` : ''}
              </div>
            </div>
          \`;
        })
        .join('');
    }

    function startPolling() {
      loadTasks();
      pollInterval = setInterval(loadTasks, 500);
    }

    setInterval(() => {
      const allDone = Array.from(tasks.values()).every(t => t.status === 'completed');
      if (allDone && pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }, 1000);

    loadTasks();
  </script>
</body>
</html>`;
}

