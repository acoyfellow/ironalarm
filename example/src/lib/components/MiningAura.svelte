<script lang="ts">
  interface Props {
    color: string;
    intensity: number;
  }

  let { color, intensity }: Props = $props();

  const springConfig = {
    stiffness: 0.1,
    damping: 0.4,
  };

</script>

<div
  class="mining-aura"
  style="color: {color}; opacity: {intensity};"
></div>

<style>
  .mining-aura {
    position: absolute;
    inset: -10px;
    border-radius: inherit;
    pointer-events: none;
    background: radial-gradient(ellipse 80% 60% at 50% 0%, currentColor 0%, transparent 70%);
    opacity: 0.08;
  }
</style>

