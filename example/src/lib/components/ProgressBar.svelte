<script lang="ts">
  interface Props {
    elapsed: number;
    total: number;
  }

  let { elapsed, total }: Props = $props();

  const percent = Math.min((elapsed / total) * 100, 100);
</script>

<div class="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
  <div
    class="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
    style="width: {percent}%"
  />
</div>



