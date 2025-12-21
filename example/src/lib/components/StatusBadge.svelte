<script lang="ts">
  interface Props {
    status: 'completed' | 'running' | 'queued' | 'failed' | 'paused' | 'pending';
  }

  let { status }: Props = $props();

  const styles = {
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    running: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    queued: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
    failed: 'bg-red-500/15 text-red-400 border-red-500/20',
    paused: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
    pending: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
  };
</script>

<span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase tracking-wide border rounded-md {styles[status]}">
  {#if status === 'running'}
    <span class="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
  {/if}
  {#if status === 'completed'}
    <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
  {/if}
  {status}
</span>

