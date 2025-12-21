<script lang="ts">
  interface Props {
    name: string;
    signature: string;
    description: string;
  }

  let { name, signature, description }: Props = $props();
</script>

<div class="py-4 border-b border-zinc-800/50 last:border-0">
  <code class="text-sm text-orange-400 font-mono">{name}</code>
  <code class="text-sm text-zinc-500 font-mono ml-1">{signature}</code>
  <p class="text-sm text-zinc-500 mt-1">{description}</p>
</div>

