<script lang="ts">
  interface Props {
    color: string;
    speed: number; // milliseconds per cycle
  }

  let { color, speed }: Props = $props();
</script>

<div
  class="resource-wave"
  style="color: {color}; animation-duration: {speed}ms;"
></div>

<style>
  .resource-wave {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, currentColor, transparent);
    pointer-events: none;
    animation: resource-wave linear infinite;
  }

  @keyframes resource-wave {
    0% {
      transform: translateX(-100%);
      opacity: 0.3;
    }
    50% {
      opacity: 0.6;
    }
    100% {
      transform: translateX(100%);
      opacity: 0;
    }
  }
</style>

