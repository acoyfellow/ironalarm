<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import MoreVertical from "@lucide/svelte/icons/more-vertical";
  import MiningAura from "$lib/components/MiningAura.svelte";
  import ResourceWave from "$lib/components/ResourceWave.svelte";
  import DollarSign from "@lucide/svelte/icons/dollar-sign";

  interface Props {
    node: {
      id: string;
      name: string;
      yield: number;
      timeMs: number;
      cost: number;
      color: string;
      image: string;
    };
    minersOnNode: number;
    atCapacity: boolean;
    efficiencyColor: string;
    efficiency: number;
    projectedEarnings: number;
    synergy: number;
    totalSellValue: number;
    nodeTasks: Array<[string, any]>;
    getMinerProgress: (taskId: string) => number;
    getSellValue: (taskId: string) => number;
    handleSellMiner: (taskId: string) => void;
    handleBuyMaxMiners: (nodeId: string) => void;
    handleSellAllMinersOnNode: (nodeId: string) => void;
    handleDeployMiner: (nodeId: string) => void;
    triggerParticleBurst: (
      element: HTMLElement | null,
      color: string,
      count: number
    ) => void;
    resources: Record<string, number>;
    MAX_MINERS_PER_NODE: number;
  }

  let {
    node,
    minersOnNode,
    atCapacity,
    efficiencyColor,
    efficiency,
    projectedEarnings,
    synergy,
    totalSellValue,
    nodeTasks,
    getMinerProgress,
    getSellValue,
    handleSellMiner,
    handleBuyMaxMiners,
    handleSellAllMinersOnNode,
    handleDeployMiner,
    triggerParticleBurst,
    resources,
    MAX_MINERS_PER_NODE,
  }: Props = $props();

  // Helper to convert hex to rgba with opacity
  function hexToRgba(hex: string, opacity: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  const mutedBorderColor = $derived.by(() =>
    minersOnNode > 0 ? hexToRgba(node.color, 0.5) : "#4b5563"
  );
</script>

<div
  class="relative border-2 rounded-lg p-4 sm:p-5 transition-all text-left w-full min-h-[44px] card-3d {minersOnNode >
  0
    ? 'bg-green-950/30 shadow-lg'
    : 'bg-gray-900/50'}"
  style="border-color: {mutedBorderColor}; box-shadow: {minersOnNode > 0
    ? `0 0 8px ${node.color}15, inset 0 0 15px ${efficiencyColor}08`
    : 'none'};"
>
  <!-- Efficiency Badge with Tooltip -->
  {#if minersOnNode > 0}
    <Tooltip.Root>
      <Tooltip.Trigger>
        <div
          class="absolute top-3 left-3 px-2.5 py-1.5 rounded-md text-xs font-semibold tracking-wide z-10 cursor-help"
          style="background: {efficiencyColor}20; color: {efficiencyColor}; border: 1px solid {efficiencyColor}50;"
        >
          ROI: {efficiency.toFixed(1)}
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content class="max-w-[200px] text-xs">
        <p class="font-semibold mb-1">Return on Investment</p>
        <p class="text-gray-300">Higher = better profit per miner. Gold+ rocks give 2-8x more ROI than copper.</p>
      </Tooltip.Content>
    </Tooltip.Root>
  {/if}

  <!-- Mining Aura -->
  {#if minersOnNode > 0}
    <MiningAura
      color={node.color}
      intensity={Math.min(0.5, minersOnNode * 0.1)}
    />
  {/if}

  <!-- Resource Wave -->
  {#if minersOnNode > 0}
    <ResourceWave color={node.color} speed={node.timeMs} />
  {/if}

  <!-- Actions dropdown (top-right) -->
  <div class="absolute top-2 right-2 z-20">
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button
          size="icon"
          variant="ghost"
          class="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <MoreVertical class="w-4 h-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content class="bg-gray-900 border-gray-700">
        <DropdownMenu.Label class="text-gray-400"
          >{node.name}</DropdownMenu.Label
        >
        <DropdownMenu.Item
          class="text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
          onclick={() => handleBuyMaxMiners(node.id)}
          disabled={atCapacity || (resources.copper || 0) < node.cost}
        >
          Buy Max
        </DropdownMenu.Item>
        {#if minersOnNode > 0}
          <DropdownMenu.Separator class="bg-gray-700" />
          <DropdownMenu.Item
            class="text-amber-400 hover:bg-amber-500/20 cursor-pointer"
            onclick={() => handleSellAllMinersOnNode(node.id)}
          >
            Sell All ({minersOnNode} miners) - {totalSellValue.toLocaleString()}
          </DropdownMenu.Item>
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
  <!-- Node image -->
  <div class="flex justify-center mb-4 sm:mb-5">
    <div
      class="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 p-2 sm:p-2.5 bg-gradient-to-br from-black/40 to-black/60 flex items-center justify-center transition-all duration-300 {minersOnNode >
      0
        ? 'shadow-2xl scale-105'
        : ''}"
      style="border-color: {minersOnNode > 0
        ? hexToRgba(node.color, 0.5)
        : '#4b5563'}; box-shadow: {minersOnNode > 0
        ? `0 0 8px ${node.color}20, inset 0 0 12px ${node.color}10`
        : 'none'};"
    >
      {#if minersOnNode > 0}
        <div
          class="absolute inset-0 rounded-xl"
          style="background: radial-gradient(ellipse 80% 60% at 50% 0%, {node.color}10 0%, transparent 70%);"
        ></div>
      {/if}
      <img
        src={node.image}
        alt={node.name}
        class="relative z-10 w-full h-full object-contain drop-shadow-2xl filter {minersOnNode >
        0
          ? 'brightness-110'
          : ''}"
      />
    </div>
  </div>

  <!-- Node info -->
  <div class="mb-4 space-y-2">
    <div>
      <h3
        class="text-lg sm:text-xl font-bold leading-tight mb-1"
        style="color: {node.color}"
      >
        {node.name}
      </h3>
      <div
        class="flex items-center gap-3 text-sm text-gray-400 leading-relaxed"
      >
        <span
          >Yield: <span class="text-gray-300 font-medium">{node.yield}</span
          ></span
        >
        <span class="text-gray-600">•</span>
        <span
          >Time: <span class="text-gray-300 font-medium"
            >{node.timeMs / 1000}s</span
          ></span
        >
      </div>
    </div>

    <div class="flex items-center gap-4 pt-1">
      {#if node.cost > 0}
        <div class="text-sm text-yellow-400">
          <span class="text-gray-500">Cost:</span>
          <span class="font-semibold">{node.cost.toLocaleString()}</span>
        </div>
      {:else}
        <div class="text-sm text-green-400 font-semibold">FREE</div>
      {/if}
      <div class="text-sm {atCapacity ? 'text-red-400' : 'text-gray-500'}">
        <span class="text-gray-500">Miners:</span>
        <span class="font-medium">{minersOnNode}/{MAX_MINERS_PER_NODE}</span>
      </div>
    </div>

    {#if minersOnNode > 0}
      <div class="pt-2 border-t border-gray-800/50 space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500 uppercase tracking-wider"
            >Production</span
          >
          <span class="text-sm text-emerald-400 font-mono font-semibold">
            +{projectedEarnings.toLocaleString()}/min
          </span>
        </div>
        {#if synergy > 1.0}
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500 uppercase tracking-wider"
              >Synergy</span
            >
            <span class="text-sm text-purple-400 font-semibold">
              +{Math.round((synergy - 1) * 100)}%
            </span>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Miners on this node -->
  {#if minersOnNode > 0}
    <div class="space-y-2 sm:space-y-2.5 mt-4 pt-4 border-t border-gray-800/50">
      {#each nodeTasks as [taskId, miner]}
        {@const progress = getMinerProgress(taskId)}
        <div
          class="bg-black/70 rounded-lg p-3 border border-cyan-500/50 relative overflow-hidden"
        >
          <div
            class="flex items-center justify-between mb-2 relative z-10 gap-3"
          >
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <div class="w-2 h-2 rounded-full bg-cyan-500 shrink-0"></div>
              <div class="text-sm font-mono">
                <span class="text-cyan-400 font-medium">Miner</span>
                <span class="text-gray-400 ml-1.5">×{miner.cycle}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              {#if getSellValue(taskId) > 0}
                <span
                  class="text-sm text-yellow-400 font-semibold whitespace-nowrap tabular-nums"
                >
                  {getSellValue(taskId).toLocaleString()}
                </span>
              {/if}
              <Button
                size="icon"
                variant="ghost"
                onclick={(e) => {
                  e.stopPropagation();
                  handleSellMiner(taskId);
                }}
                class="h-8 w-8 text-green-400 hover:bg-green-900/30 transition-all hover:scale-110 touch-manipulation"
                title={`Sell for ${getSellValue(taskId).toLocaleString()} Copper`}
              >
                <DollarSign class="w-4 h-4" />
              </Button>
            </div>
          </div>
          <!-- Progress bar -->
          <div
            class="w-full h-2 bg-gray-800 rounded-full overflow-hidden relative z-10"
          >
            <div
              class="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-100"
              style="width: {progress *
                100}%; box-shadow: 0 0 8px {node.color};"
            ></div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Deploy button -->
  {#if !atCapacity && resources.copper >= node.cost}
    <button
      type="button"
      class="w-full mt-4 px-4 py-3 text-sm font-semibold rounded-lg transition-all leading-relaxed bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 hover:text-cyan-300 border border-cyan-500/50 hover:border-cyan-400"
      onclick={(e) => {
        const target = e.currentTarget as HTMLElement;
        triggerParticleBurst(target, node.color, 8);
        handleDeployMiner(node.id);
      }}
    >
      + Deploy Miner
    </button>
  {/if}

  <!-- Mining animation overlay -->
  {#if minersOnNode > 0}
    <div
      class="absolute inset-0 pointer-events-none rounded-lg"
      style="background: radial-gradient(ellipse 80% 60% at 50% 0%, {node.color}08 0%, transparent 70%);"
    ></div>
  {/if}
</div>
