<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    startTask,
    getTasks,
    cancelTask,
  } from "$routes/data.remote";
  import TaskCard from "./TaskCard.svelte";

  let inputValue = $state("AI agents");
  let selectedDuration = $state(60);
  let isStarting = $state(false);
  let tasks = $state<any[]>([]);
  let dropdownOpen = $state(false);
  let pollingInterval: ReturnType<typeof setInterval> | null = null;
  let now = $state(Date.now());

  const durationOptions = [
    { label: '1 second', value: 1 },
    { label: '10 seconds', value: 10 },
    { label: 'Demo (60s)', value: 60 },
    { label: 'Realistic (1 hour)', value: 3600 },
    { label: 'Production (1 week)', value: 604800 },
    { label: '1 Month', value: 2592000 },
    { label: '1 Year', value: 31536000 },
  ];

  const selectedLabel = $derived(durationOptions.find(d => d.value === selectedDuration)?.label || 'Demo (60s)');

  async function handleStart() {
    isStarting = true;
    try {
      const complexityMap: Record<number, string> = {
        1: '1s',
        10: '10s',
        60: 'demo',
        3600: 'realistic',
        604800: 'production',
        2592000: 'month',
        31536000: 'year',
      };
      
      await startTask({
        taskName: "agent-loop",
        complexity: complexityMap[selectedDuration] || 'demo',
        namespace: "task",
      });
      await new Promise((r) => setTimeout(r, 500));
      await loadTasks();
    } catch (error) {
      alert("Failed to start task: " + (error as Error).message);
    } finally {
      isStarting = false;
    }
  }

  async function loadTasks() {
    try {
      const fetchedTasks = await getTasks("task");
      tasks = fetchedTasks;
      updatePolling();
    } catch (error) {
      console.error("Failed to load tasks:", error);
    }
  }

  async function handleCancel(taskId: string) {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    try {
      await cancelTask(taskId);
      await loadTasks();
    } catch (error) {
      console.error("Failed to cancel task:", error);
    }
  }

  function updatePolling() {
    const hasRunningTasks = tasks.some(
      (t) => t.status === "running" || t.status === "pending"
    );

    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }

    if (hasRunningTasks) {
      pollingInterval = setInterval(async () => {
        await loadTasks();
      }, 1000);
    }
  }

  onMount(async () => {
    await loadTasks();
    updatePolling();

    const timeInterval = setInterval(() => {
      now = Date.now();
    }, 1000);

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
      clearInterval(timeInterval);
    };
  });

  onDestroy(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  });

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  }

  function formatElapsed(
    startedAt: number,
    pausedAt?: number,
    totalPausedMs = 0,
    status?: string,
    completedAt?: number
  ): number {
    const currentTime = status === "completed" && completedAt ? completedAt : now;
    if (pausedAt) {
      return Math.floor((pausedAt - startedAt - totalPausedMs) / 1000);
    }
    return Math.floor((currentTime - startedAt - totalPausedMs) / 1000);
  }
</script>

<!-- Start Task Panel -->
<div class="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl mb-6">
  <div class="flex items-center gap-2 mb-4">
    <svg class="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    </svg>
    <span class="text-sm font-medium text-zinc-300">Start a Task</span>
  </div>
  
  <div class="flex flex-col sm:flex-row gap-3">
    <input
      type="text"
      bind:value={inputValue}
      placeholder="Task name..."
      class="flex-1 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 font-mono transition-all"
    />
    
    <!-- Duration Dropdown -->
    <div class="relative">
      <button
        onclick={() => dropdownOpen = !dropdownOpen}
        class="w-full sm:w-48 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-300 text-left flex items-center justify-between hover:border-zinc-700 transition-colors"
      >
        <span class="font-mono">{selectedLabel}</span>
        <svg class="w-4 h-4 text-zinc-500 transition-transform {dropdownOpen ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {#if dropdownOpen}
        <div class="absolute z-10 mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden">
          {#each durationOptions as opt}
            <button
              onclick={() => {
                selectedDuration = opt.value;
                dropdownOpen = false;
              }}
              class="w-full px-4 py-2.5 text-sm text-left hover:bg-zinc-800 transition-colors flex items-center gap-2 {selectedDuration === opt.value ? 'text-orange-400' : 'text-zinc-400'}"
            >
              {#if selectedDuration === opt.value}
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width={3} d="M5 13l4 4L19 7" />
                </svg>
              {/if}
              <span class={selectedDuration === opt.value ? '' : 'ml-5'}>{opt.label}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
    
    <button
      onclick={handleStart}
      disabled={isStarting}
      class="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {#if isStarting}
        <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      {:else}
        Start
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        </svg>
      {/if}
    </button>
  </div>
  
  <p class="mt-3 text-xs text-zinc-600">
    Simulates a long-running agent task with checkpoints: <code class="text-zinc-500">research</code> → <code class="text-zinc-500">analysis</code> → <code class="text-zinc-500">synthesis</code> → <code class="text-zinc-500">writeup</code>
  </p>
</div>

<!-- Running Tasks -->
<div class="bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden">
  <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50">
    <h3 class="text-sm font-medium text-zinc-300">Running Tasks</h3>
    <div class="flex items-center gap-3 text-xs text-zinc-600">
      <span class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {tasks.filter(t => t.status === 'completed').length} completed
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        {tasks.filter(t => t.status === 'running').length} running
      </span>
    </div>
  </div>
  
  <div class="p-4 space-y-3">
    {#if tasks.length === 0}
      <p class="text-sm text-zinc-600 text-center py-8">No tasks yet. Start one above to see the scheduler in action!</p>
    {:else}
      {#each tasks as task (task.taskId)}
        {@const elapsedSeconds = task.startedAt 
          ? formatElapsed(
              task.startedAt,
              task.pausedAt,
              task.totalPausedMs || 0,
              task.status,
              task.completedAt
            )
          : 0}
        {@const duration = task.duration || (task.progress?.totalSteps ? task.progress.totalSteps * 15 : 60)}
        {@const checkpoints = task.progress?.checkpoints || task.progress?.completedSteps || []}
        
        <div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
          <div class="flex items-start justify-between mb-3">
            <div>
              <code class="text-sm text-zinc-300 font-mono">{task.taskId}</code>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-zinc-600">{formatDuration(elapsedSeconds)} / {formatDuration(duration)}</span>
              </div>
            </div>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase tracking-wide border rounded-md {task.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : task.status === 'running' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'}">
              {#if task.status === 'running'}
                <span class="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              {/if}
              {#if task.status === 'completed'}
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              {/if}
              {task.status}
            </span>
          </div>
          
          <div class="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-3">
            <div
              class="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
              style="width: {Math.min((elapsedSeconds / duration) * 100, 100)}%"
            />
          </div>
          
          <div class="flex items-center gap-1">
            {#each ['research', 'analysis', 'synthesis', 'writeup'] as step, i}
              <span class="text-xs font-mono {checkpoints.includes(step) ? 'text-emerald-400' : 'text-zinc-600'}">
                {step}
              </span>
              {#if i < 3}
                <span class="text-zinc-700 text-xs">→</span>
              {/if}
            {/each}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
