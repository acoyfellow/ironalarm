<script lang="ts">
   import { onMount, onDestroy, untrack } from "svelte";
   import {
     startTask,
     getTasks,
     cancelTask,
     pauseTask,
     resumeTask,
   } from "$routes/data.remote";
   import { createWebSocket } from "$lib/websocket-service";
   import TaskCard from "./TaskCard.svelte";

  // Accept initial data from server load
  let { data }: { data?: { tasks: any[] } } = $props();

  let inputValue = $state("AI agents");
  let selectedDuration = $state(60);
  let isStarting = $state(false);
  let tasks = $state<any[]>(data?.tasks || []);
  let dropdownOpen = $state(false);
  let pollingInterval: ReturnType<typeof setInterval> | null = null;
  let wsClose: (() => void) | null = null;
  let now = $state(Date.now());
   let pausingTaskId = $state<string | null>(null);
   let resumingTaskId = $state<string | null>(null);

   const durationOptions = [
     { value: 60, label: "1 minute" },
     { value: 300, label: "5 minutes" },
     { value: 900, label: "15 minutes" },
     { value: 1800, label: "30 minutes" },
     { value: 3600, label: "1 hour" }
   ];

   let selectedLabel = $derived(durationOptions.find(opt => opt.value === selectedDuration)?.label || "1 minute");

  async function handleStart() {
    isStarting = true;
    try {
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

  async function handlePause(taskId: string) {
    pausingTaskId = taskId;
    try {
      await pauseTask(taskId);
      await loadTasks();
    } catch (error) {
      console.error("Failed to pause task:", error);
      alert("Failed to pause task: " + (error as Error).message);
    } finally {
      pausingTaskId = null;
    }
  }

  async function handleResume(taskId: string) {
    resumingTaskId = taskId;
    try {
      await resumeTask(taskId);
      await loadTasks();
    } catch (error) {
      console.error("Failed to resume task:", error);
      alert("Failed to resume task: " + (error as Error).message);
    } finally {
      resumingTaskId = null;
    }
  }

  function updatePolling() {
    const hasRunningTasks = tasks.some(
      (t) =>
        t.status === "running" ||
        t.status === "pending" ||
        t.status === "paused"
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

  // Initialize tasks from server data
  $effect(() => {
    if (data?.tasks) {
      tasks = data.tasks;
    }
  });

  onMount(() => {
    // Tasks are already loaded from server, just start polling for updates
    updatePolling();

     // WebSocket connection for real-time updates
     const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
     const host = import.meta.env.DEV
       ? "localhost:1337"
       : "ironalarm-api.coey.dev";
     const wsUrl = `${protocol}//${host}/ws`;

     let wsDisconnectedTime: number | null = null;
     let pollInterval: ReturnType<typeof setInterval> | null = null;

     const startPollingFallback = () => {
       if (pollInterval) return;
       pollInterval = setInterval(() => {
         if (!wsClose && wsDisconnectedTime && Date.now() - wsDisconnectedTime > 5000) {
           loadTasks();
         }
       }, 2000);
     };

     const stopPollingFallback = () => {
       if (pollInterval) {
         clearInterval(pollInterval);
         pollInterval = null;
       }
       wsDisconnectedTime = null;
     };

     const ws = createWebSocket(
       wsUrl,
       (message) => {
         if (message.type === "tasks") {
           untrack(() => {
             tasks = message.data.filter((t: any) => t.taskId.startsWith("task-"));
           });
         }
       },
       () => {
         stopPollingFallback();
       },
       () => {
         wsDisconnectedTime = Date.now();
         startPollingFallback();
       }
     );
     wsClose = ws.close;

     const timeInterval = setInterval(() => {
       now = Date.now();
     }, 1000);

     return () => {
       if (pollingInterval) clearInterval(pollingInterval);
       clearInterval(timeInterval);
       stopPollingFallback();
       wsClose?.();
     };
   });

   onDestroy(() => {
     if (pollingInterval) {
       clearInterval(pollingInterval);
     }
     wsClose?.();
   });

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    if (seconds < 86400)
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  }

  function formatElapsed(
    startedAt: number,
    pausedAt?: number,
    totalPausedMs = 0,
    status?: string,
    completedAt?: number
  ): number {
    const currentTime =
      status === "completed" && completedAt ? completedAt : now;
    if (pausedAt) {
      return Math.floor((pausedAt - startedAt - totalPausedMs) / 1000);
    }
    return Math.floor((currentTime - startedAt - totalPausedMs) / 1000);
  }
</script>

<!-- Start Task Panel -->
<div class="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl mb-6">
  <div class="flex items-center gap-2 mb-4">
    <svg
      class="w-4 h-4 text-zinc-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width={2}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
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
        onclick={() => (dropdownOpen = !dropdownOpen)}
        class="w-full sm:w-48 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-300 text-left flex items-center justify-between hover:border-zinc-700 transition-colors"
      >
        <span class="font-mono">{selectedLabel}</span>
        <svg
          class="w-4 h-4 text-zinc-500 transition-transform {dropdownOpen
            ? 'rotate-180'
            : ''}"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {#if dropdownOpen}
        <div
          class="absolute z-10 mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden"
        >
          {#each durationOptions as opt}
            <button
              onclick={() => {
                selectedDuration = opt.value;
                dropdownOpen = false;
              }}
              class="w-full px-4 py-2.5 text-sm text-left hover:bg-zinc-800 transition-colors flex items-center gap-2 {selectedDuration ===
              opt.value
                ? 'text-orange-400'
                : 'text-zinc-400'}"
            >
              {#if selectedDuration === opt.value}
                <svg
                  class="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              {/if}
              <span class={selectedDuration === opt.value ? "" : "ml-5"}
                >{opt.label}</span
              >
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
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      {:else}
        Start
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
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
        </svg>
      {/if}
    </button>
  </div>

  <p class="mt-3 text-xs text-zinc-600">
    Simulates a long-running agent task with checkpoints: <code
      class="text-zinc-500">research</code
    >
    → <code class="text-zinc-500">analysis</code> →
    <code class="text-zinc-500">synthesis</code>
    → <code class="text-zinc-500">writeup</code>
  </p>
</div>

<!-- Running Tasks -->
<div
  class="bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden"
>
  <div
    class="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50"
  >
    <h3 class="text-sm font-medium text-zinc-300">Running Tasks</h3>
    <div class="flex items-center gap-3 text-xs text-zinc-600">
      <span class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        {tasks.filter((t) => t.status === "completed").length} completed
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        {tasks.filter((t) => t.status === "running").length} running
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-zinc-500" />
        {tasks.filter((t) => t.status === "paused").length} paused
      </span>
    </div>
  </div>

  <div class="p-4 space-y-3">
    {#if tasks.length === 0}
      <p class="text-sm text-zinc-600 text-center py-8">
        No tasks yet. Start one above to see the scheduler in action!
      </p>
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
        {@const duration =
          task.duration ||
          (task.progress?.totalSteps ? task.progress.totalSteps * 15 : 60)}
        {@const checkpoints =
          task.progress?.checkpoints || task.progress?.completedSteps || []}

        <div
          class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <code class="text-sm text-zinc-300 font-mono">{task.taskId}</code>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-zinc-600"
                  >{formatDuration(elapsedSeconds)} / {formatDuration(
                    duration
                  )}</span
                >
              </div>
            </div>
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase tracking-wide border rounded-md {task.status ===
              'completed'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                : task.status === 'running'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                  : task.status === 'paused'
                    ? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
                    : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'}"
            >
              {#if task.status === "running"}
                <span
                  class="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"
                />
              {/if}
              {#if task.status === "completed"}
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              {/if}
              {#if task.status === "paused"}
                <span class="w-1.5 h-1.5 bg-zinc-400 rounded-full" />
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

          <div class="flex items-center gap-1 mb-3">
            {#each ["research", "analysis", "synthesis", "writeup"] as step, i}
              <span
                class="text-xs font-mono {checkpoints.includes(step)
                  ? 'text-emerald-400'
                  : 'text-zinc-600'}"
              >
                {step}
              </span>
              {#if i < 3}
                <span class="text-zinc-700 text-xs">→</span>
              {/if}
            {/each}
          </div>

          <div class="flex items-center gap-2">
            {#if task.status === "running"}
              <button
                onclick={() => handlePause(task.taskId)}
                disabled={pausingTaskId === task.taskId}
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {#if pausingTaskId === task.taskId}
                  <svg
                    class="w-3 h-3 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                {:else}
                  <svg
                    class="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                {/if}
                Pause
              </button>
            {:else if task.status === "paused"}
              <button
                onclick={() => handleResume(task.taskId)}
                disabled={resumingTaskId === task.taskId}
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {#if resumingTaskId === task.taskId}
                  <svg
                    class="w-3 h-3 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                {:else}
                  <svg
                    class="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                  </svg>
                {/if}
                Resume
              </button>
            {/if}
            {#if task.status !== "completed"}
              <button
                onclick={() => handleCancel(task.taskId)}
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors"
              >
                <svg
                  class="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Cancel
              </button>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
