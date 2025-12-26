<script lang="ts">
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  interface Props {
    color: string;
    angle: number;
    distance: number;
    x: number;
    y: number;
  }

  let { color, angle, distance, x, y }: Props = $props();

  const deltaX = $derived(Math.cos(angle) * distance);
  const deltaY = $derived(Math.sin(angle) * distance);
</script>

<div
  class="particle"
  style="background: {color}; left: {x}px; top: {y}px;"
  transition:fly={{
    x: deltaX,
    y: deltaY,
    duration: 1000,
    easing: cubicOut,
    opacity: 0,
  }}
></div>

<style>
  .particle {
    position: fixed;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 9997;
  }
</style>
