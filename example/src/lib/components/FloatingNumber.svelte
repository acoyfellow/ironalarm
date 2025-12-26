<script lang="ts">
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  interface Props {
    value: number;
    x: number;
    y: number;
    color: string;
    multiplier?: number;
  }

  let { value, x, y, color, multiplier }: Props = $props();
</script>

<div
  class="floating-number"
  style="left: {x}px; top: {y}px; color: {color};"
  transition:fly={{ y: -100, duration: 2000, easing: cubicOut, opacity: 0 }}
>
  <span class="font-black text-2xl" style="text-shadow: 0 0 10px {color};">
    +{value.toLocaleString()}
  </span>
  {#if multiplier && multiplier > 1}
    <span class="text-yellow-400 ml-1" style="text-shadow: 0 0 10px #fbbf24;">
      ×{multiplier}
    </span>
  {/if}
</div>

<style>
  .floating-number {
    position: fixed;
    pointer-events: none;
    z-index: 9999;
    font-weight: 900;
    white-space: nowrap;
  }
</style>





