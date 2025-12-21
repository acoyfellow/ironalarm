<script lang="ts">
  import StatusBadge from './StatusBadge.svelte';
  import ProgressBar from './ProgressBar.svelte';

  interface Props {
    task: {
      taskId: string;
      status: string;
      duration?: number;
      elapsed?: number;
      startedAt?: number;
      pausedAt?: number;
      totalPausedMs?: number;
      completedAt?: number;
      progress?: {
        step?: string;
        checkpoints?: string[];
        currentStepIndex?: number;
        totalSteps?: number;
        completedSteps?: string[];
      };
    };
  }

  let { task }: Props = $props();

  const steps = ['research', 'analysis', 'synthesis', 'writeup'];
  
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
    completedAt?: number,
    now: number = Date.now()
  ): number {
    const currentTime = status === 'completed' && completedAt ? completedAt : now;
    if (pausedAt) {
      return Math.floor((pausedAt - startedAt - totalPausedMs) / 1000);
    }
    return Math.floor((currentTime - startedAt - totalPausedMs) / 1000);
  }

  let now = $state(Date.now());
  
  $effect(() => {
    const interval = setInterval(() => {
      now = Date.now();
    }, 1000);
    return () => clearInterval(interval);
  });

  const elapsedSeconds = task.startedAt 
    ? formatElapsed(
        task.startedAt,
        task.pausedAt,
        task.totalPausedMs || 0,
        task.status,
        task.completedAt,
        now
      )
    : 0;
  
  const duration = task.duration || (task.progress?.totalSteps ? task.progress.totalSteps * 15 : 60);
  const checkpoints = task.progress?.checkpoints || task.progress?.completedSteps || [];
</script>

<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
  <div class="flex items-start justify-between mb-3">
    <div>
      <code class="text-sm text-zinc-300 font-mono">{task.taskId}</code>
      <div class="flex items-center gap-2 mt-1">
        <span class="text-xs text-zinc-600">{formatDuration(elapsedSeconds)} / {formatDuration(duration)}</span>
      </div>
    </div>
    <StatusBadge status={task.status as any} />
  </div>
  
  <ProgressBar elapsed={elapsedSeconds} total={duration} />
  
  <div class="flex items-center gap-1 mt-3">
    {#each steps as step, i}
      <span class="text-xs font-mono {checkpoints.includes(step) ? 'text-emerald-400' : 'text-zinc-600'}">
        {step}
      </span>
      {#if i < steps.length - 1}
        <span class="text-zinc-700 text-xs">→</span>
      {/if}
    {/each}
  </div>
</div>

