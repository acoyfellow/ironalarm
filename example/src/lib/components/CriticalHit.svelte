<script lang="ts">
  import { spring } from "svelte/motion";

  interface Props {
    multiplier: number;
    x: number;
    y: number;
  }

  let { multiplier, x, y }: Props = $props();

  const springConfig = {
    stiffness: 0.1,
    damping: 0.4,
  };

  const scale = spring(1, springConfig);
  const rotation = spring(0, springConfig);

  // Trigger animation only once on mount
  let mounted = $state(false);
  $effect(() => {
    if (mounted) return;
    mounted = true;
    scale.set(1.3);
    rotation.set(Math.random() * 10 - 5); // Random rotation between -5 and 5 degrees
    setTimeout(() => {
      scale.set(1);
      rotation.set(0);
    }, 500);
  });
</script>

<div
  class="critical-hit"
  style="left: {x}px; top: {y}px; transform: scale({$scale}) rotate({$rotation}deg);"
>
  <span class="font-black text-5xl text-yellow-400" style="text-shadow: 0 0 20px #fbbf24, 0 0 40px #fbbf24;">
    {multiplier}× CRITICAL!
  </span>
</div>

<style>
  .critical-hit {
    position: fixed;
    pointer-events: none;
    z-index: 10000;
    font-weight: 900;
    white-space: nowrap;
    transform-origin: center;
  }
</style>

