<script lang="ts">
  import { onMount } from "svelte";
  import { codeToHtml } from "shiki";
  import Copy from "@lucide/svelte/icons/copy";
  import Check from "@lucide/svelte/icons/check";

  interface Props {
    code: string;
    lang?: string;
    theme?: string;
    showCopy?: boolean;
  }

  let {
    code,
    lang = "typescript",
    theme = "github-dark",
    showCopy = true,
  }: Props = $props();

  let highlighted = $state<string>("");
  let copied = $state(false);
  let loading = $state(true);

  onMount(async () => {
    try {
      highlighted = await codeToHtml(code, {
        lang,
        theme,
      });
    } catch (error) {
      console.error("Failed to highlight code:", error);
      highlighted = `<pre><code>${code}</code></pre>`;
    } finally {
      loading = false;
    }
  });

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<div class="relative group">
  {#if loading}
    <pre
      class="bg-zinc-950 text-zinc-100 p-4 rounded-xl font-mono text-sm overflow-x-auto border border-zinc-800"
    >
      <code>{code}</code>
    </pre>
  {:else}
    <div
      class="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden"
      class:max-h-[500px]={code.split("\n").length > 20}
    >
      <div class="overflow-x-auto">
        {@html highlighted}
      </div>
    </div>
  {/if}
  {#if showCopy}
    <button
      onclick={copyCode}
      class="absolute top-3 right-3 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors opacity-0 group-hover:opacity-100 z-10"
      aria-label="Copy code"
    >
      {#if copied}
        <Check class="w-4 h-4 text-green-400" />
      {:else}
        <Copy class="w-4 h-4 text-zinc-400" />
      {/if}
    </button>
  {/if}
</div>

<style>
  :global(.shiki) {
    margin: 0;
    padding: 1rem;
    background: transparent !important;
    overflow-x: auto;
  }

  :global(.shiki code) {
    font-family: "JetBrains Mono", "Fira Code", "Consolas", monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    display: block;
    width: 100%;
  }

  :global(.shiki span) {
    display: inline;
  }
</style>

