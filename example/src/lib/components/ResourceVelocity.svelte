<script lang="ts">
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import { spring } from "svelte/motion";

  interface Props {
    velocity: number;
  }

  let { velocity }: Props = $props();

  const displayedVelocity = tweened(0, {
    duration: 300,
    easing: cubicOut,
  });

  const springConfig = {
    stiffness: 0.2,
    damping: 0.4,
  };

  const rotation = spring(0, springConfig);

  $effect(() => {
    displayedVelocity.set(velocity);

    // Rotate arrow based on velocity direction
    if (velocity > 0) {
      rotation.set(-45); // Pointing up-right
    } else if (velocity < 0) {
      rotation.set(45); // Pointing down-right
    } else {
      rotation.set(0); // Horizontal
    }
  });

  const velocityColor = $derived.by(() => {
    if (velocity > 0) return "#10b981"; // Green
    if (velocity < 0) return "#ef4444"; // Red
    return "#6b7280"; // Gray
  });
</script>

<div class="flex items-center gap-1.5">
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    style="transform: rotate({$rotation}deg); transition: transform 0.3s ease;"
  >
    <path
      d="M8 2 L12 8 L8 7 L4 8 Z"
      fill={velocityColor}
      opacity="0.8"
    />
  </svg>
  <span
    class="text-xs font-mono tabular-nums"
    style="color: {velocityColor};"
  >
    {$displayedVelocity.toFixed(1)}/s
  </span>
</div>





