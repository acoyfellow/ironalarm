<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { startTask, getTasks, cancelTask } from "$routes/data.remote";
  import { createWebSocket } from "$lib/websocket-service";
  import { Button } from "$lib/components/ui/button";
  import DollarSign from "@lucide/svelte/icons/dollar-sign";

  // Resource node configuration
  const RESOURCE_NODES = [
    {
      id: "copper",
      name: "Copper Rock",
      yield: 1,
      timeMs: 4000,
      level: 1,
      cost: 0,
      color: "#cd7f32",
      image: "/copper.png",
    },
    {
      id: "iron",
      name: "Iron Rock",
      yield: 2,
      timeMs: 6000,
      level: 10,
      cost: 50,
      color: "#808080",
      image: "/iron.png",
    },
    {
      id: "silver",
      name: "Silver Rock",
      yield: 3,
      timeMs: 8000,
      level: 25,
      cost: 200,
      color: "#c0c0c0",
      image: "/silver.png",
    },
    {
      id: "gold",
      name: "Gold Rock",
      yield: 5,
      timeMs: 10000,
      level: 40,
      cost: 500,
      color: "#ffd700",
      image: "/gold.png",
    },
    {
      id: "cobalt",
      name: "Cobalt Rock",
      yield: 8,
      timeMs: 12000,
      level: 55,
      cost: 1000,
      color: "#0047ab",
      image: "/cobalt.png",
    },
    {
      id: "obsidian",
      name: "Obsidian Rock",
      yield: 12,
      timeMs: 14000,
      level: 70,
      cost: 2000,
      color: "#4b0082",
      image: "/obsidian.png",
    },
    {
      id: "astral",
      name: "Astral Rock",
      yield: 18,
      timeMs: 16000,
      level: 85,
      color: "#87ceeb",
      cost: 5000,
      image: "/astral.png",
    },
    {
      id: "infernal",
      name: "Infernal Rock",
      yield: 25,
      timeMs: 18000,
      level: 100,
      color: "#ff4500",
      cost: 10000,
      image: "/infernal.png",
    },
  ];

  let wsConnected = $state(false);
  let wsClose: (() => void) | null = null;
  let tasks = $state<any[]>([]);
  let resources = $state<Record<string, number>>({});
  let speedMultiplier = $state(1);
  let now = $state(Date.now());

  // Speed upgrade costs: 500, 2000, 8000, 32000... (4x each level)
  const getUpgradeCost = (currentLevel: number) =>
    Math.floor(500 * Math.pow(4, currentLevel - 1));

  // Grid layout: 4x2 grid
  const GRID_COLS = 4;
  const GRID_ROWS = 2;
  const gridNodes = $derived(
    RESOURCE_NODES.slice(0, GRID_COLS * GRID_ROWS).map((node, index) => ({
      ...node,
      row: Math.floor(index / GRID_COLS),
      col: index % GRID_COLS,
    }))
  );

  // Filter to only mission4 tasks
  const mission4Tasks = $derived(
    tasks.filter((t) => t.taskId.startsWith("mission4-"))
  );

  // Derive miners from tasks - only mine-resource-loop tasks that are running
  const miners = $derived.by(() => {
    const minerMap = new Map<
      string,
      { nodeId: string; startTime: number; cycle: number }
    >();
    for (const task of mission4Tasks) {
      if (
        task.params?.nodeId &&
        (task.status === "running" || task.status === "pending")
      ) {
        minerMap.set(task.taskId, {
          nodeId: task.params.nodeId,
          startTime: task.startedAt || Date.now(),
          cycle: task.progress?.cycle || 0,
        });
      }
    }
    return minerMap;
  });

  // Reactive progress calculation (depends on miners)
  const minerProgress = $derived.by(() => {
    const progressMap = new Map<string, number>();
    for (const [taskId, miner] of miners.entries()) {
      const node = RESOURCE_NODES.find((n) => n.id === miner.nodeId);
      if (node) {
        const elapsed = now - miner.startTime;
        const progress = (elapsed % node.timeMs) / node.timeMs;
        progressMap.set(taskId, progress);
      }
    }
    return progressMap;
  });

  function getMinerProgress(taskId: string): number {
    return minerProgress.get(taskId) || 0;
  }

  // Update resources and speed from global state
  function updateResources() {
    const stateTask = tasks.find(
      (t) =>
        t.taskId === "mission4-global-state" ||
        (t.taskId === "global-state" && t.params?.namespace === "mission4")
    );

    // Skip completed tasks - they'll be recreated
    if (stateTask && stateTask.status === "completed") {
      if (Object.keys(resources).length === 0) resources = { copper: 0 };
      return;
    }

    if (stateTask?.progress?.resources !== undefined) {
      const res = stateTask.progress.resources;
      if (typeof res === "object" && res !== null) {
        resources = res as Record<string, number>;
      } else if (typeof res === "number") {
        resources = { copper: res };
      }
    } else if (Object.keys(resources).length === 0) {
      resources = { copper: 0 };
    }

    // Update speed multiplier
    if (stateTask?.progress?.speedMultiplier !== undefined) {
      speedMultiplier = stateTask.progress.speedMultiplier;
    }
  }

  // Update resources when tasks update
  $effect(() => {
    updateResources();
  });

  async function loadTasks() {
    try {
      const fetchedTasks = await getTasks("mission4");
      untrack(() => {
        tasks = fetchedTasks;
      });
      await updateResources();
    } catch (error) {
      console.error("Failed to load tasks:", error);
    }
  }

  const MAX_MINERS_PER_NODE = 5;

  async function handleDeployMiner(nodeId: string) {
    const node = RESOURCE_NODES.find((n) => n.id === nodeId);
    if (!node) return;

    // Check max miners per node
    const currentMiners = getMinersOnNode(nodeId);
    if (currentMiners >= MAX_MINERS_PER_NODE) {
      alert(`Maximum ${MAX_MINERS_PER_NODE} miners per node!`);
      return;
    }

    // Check if we have enough resources (client-side check)
    const currentCopper = resources.copper || 0;
    if (currentCopper < node.cost) {
      alert(
        `Need ${node.cost} Copper to deploy ${node.name} miner. You have ${currentCopper}.`
      );
      return;
    }

    try {
      await startTask({
        taskName: "mine-resource-loop",
        nodeId,
        namespace: "mission4",
        yield: node.yield,
        timeMs: node.timeMs,
        cost: node.cost, // Pass cost to server for deduction
      });
      await loadTasks();
    } catch (error) {
      console.error("Failed to deploy miner:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert("Failed to deploy miner: " + errorMsg);
    }
  }

  async function handleCancelMiner(taskId: string) {
    try {
      await cancelTask(taskId);
      await loadTasks();
    } catch (error) {
      console.error("Failed to cancel miner:", error);
    }
  }

  // Calculate sell value: cycles * yield * multiplier
  const SELL_MULTIPLIER = 2; // Each cycle's yield is worth 2x when sold

  function getSellValue(taskId: string): number {
    const miner = miners.get(taskId);
    if (!miner) return 0;

    const node = RESOURCE_NODES.find((n) => n.id === miner.nodeId);
    if (!node) return 0;

    // Total generated = cycles * yield per cycle
    const totalGenerated = miner.cycle * node.yield;
    // Sell value = total generated * multiplier
    return totalGenerated * SELL_MULTIPLIER;
  }

  async function handleSellMiner(taskId: string) {
    const miner = miners.get(taskId);
    if (!miner) return;

    const sellValue = getSellValue(taskId);
    if (sellValue === 0) {
      alert("This miner hasn't generated any resources yet!");
      return;
    }

    if (
      !(await confirm(`Sell miner for ${sellValue.toLocaleString()} Copper?`))
    ) {
      return;
    }

    try {
      // Start a task to add copper and cancel the miner
      await startTask({
        taskName: "sell-miner",
        namespace: "mission4",
        taskIdToCancel: taskId,
        copperToAdd: sellValue,
      });
      await loadTasks();
    } catch (error) {
      console.error("Failed to sell miner:", error);
      alert(
        "Failed to sell miner: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }

  function getMinersOnNode(nodeId: string): number {
    return Array.from(miners.values()).filter((m) => m.nodeId === nodeId)
      .length;
  }

  // Calculate total copper per second from all miners (accounting for speed multiplier)
  const copperPerSecond = $derived.by(() => {
    let total = 0;
    for (const miner of miners.values()) {
      const node = RESOURCE_NODES.find((n) => n.id === miner.nodeId);
      if (node) {
        // yield per timeMs -> yield per second, multiplied by speed
        total += (node.yield / node.timeMs) * 1000 * speedMultiplier;
      }
    }
    return total;
  });

  // Derived upgrade cost for current level
  const nextUpgradeCost = $derived(getUpgradeCost(speedMultiplier));
  const canAffordUpgrade = $derived((resources.copper || 0) >= nextUpgradeCost);

  async function handleSpeedUpgrade() {
    if (!canAffordUpgrade) return;
    try {
      await startTask({
        taskName: "speed-upgrade",
        namespace: "mission4",
        cost: nextUpgradeCost,
      });
      await loadTasks();
    } catch (error) {
      console.error("Failed to upgrade speed:", error);
      alert(
        "Failed to upgrade: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }

  async function handleCancelAllMiners() {
    const minerTaskIds = Array.from(miners.keys()).filter(
      (id) => id !== "mission4-global-state"
    );
    if (minerTaskIds.length === 0) return;
    if (!(await confirm(`Cancel all ${minerTaskIds.length} miners?`))) return;

    for (const taskId of minerTaskIds) {
      await cancelTask(taskId);
    }
    await loadTasks();
  }

  onMount(() => {
    loadTasks();

    // WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = import.meta.env.DEV ? "localhost:1337" : window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    const ws = createWebSocket(
      wsUrl,
      (message) => {
        if (message.type === "tasks") {
          untrack(() => {
            tasks = message.data.filter(
              (t: any) =>
                t.taskId.startsWith("mission4-") || t.taskId === "global-state"
            );
            updateResources();
          });
        }
      },
      () => {
        wsConnected = true;
      },
      () => {
        wsConnected = false;
      }
    );
    wsClose = ws.close;

    // Initialize global state
    const initGlobalState = async () => {
      try {
        const existingTasks = await getTasks("mission4");
        const globalTask = existingTasks.find(
          (t) =>
            t.taskId === "mission4-global-state" ||
            (t.taskId === "global-state" && t.params?.namespace === "mission4")
        );

        if (
          !globalTask ||
          globalTask.status === "completed" ||
          globalTask.status === "failed"
        ) {
          if (globalTask) await cancelTask(globalTask.taskId);
          await startTask({ taskName: "global-state", namespace: "mission4" });
          await loadTasks();
        } else {
          updateResources();
        }
      } catch {
        // Ignore init errors
      }
    };
    setTimeout(() => initGlobalState(), 500);

    // Update time for progress calculations - this triggers reactivity
    const progressInterval = setInterval(() => {
      now = Date.now();
    }, 100);

    // Poll for task/resource updates every 500ms for real-time updates
    const pollInterval = setInterval(() => {
      loadTasks();
    }, 500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(pollInterval);
      wsClose?.();
    };
  });
</script>

<svelte:head>
  <title>Mining Game - ironalarm</title>
</svelte:head>

<div class="min-h-screen bg-black text-white p-4 space-y-4">
  <!-- Game HUD -->
  <div class="max-w-5xl mx-auto">
    <div class="bg-gray-950 border border-gray-800 rounded-xl shadow-2xl">
      <div class="flex items-stretch">
        <!-- Resource Section -->
        <div class="flex-1 px-5 py-3 border-r border-gray-800/50">
          <div class="flex items-baseline gap-3">
            <div class="flex items-center gap-2">
              <div
                class="w-3 h-3 rounded-sm"
                style="background: #cd7f32; box-shadow: 0 0 8px #cd7f32;"
              ></div>
              <span class="text-2xl font-bold tabular-nums text-white"
                >{(resources.copper || 0).toLocaleString()}</span
              >
            </div>
            {#if copperPerSecond > 0}
              <span class="text-sm text-emerald-400 font-medium"
                >+{copperPerSecond.toFixed(1)}/s</span
              >
            {/if}
          </div>
          <div class="text-xs text-gray-500 mt-0.5 uppercase tracking-wider">
            Copper
          </div>
        </div>

        <!-- Speed Upgrade Section -->
        <div class="px-5 py-3 border-r border-gray-800/50">
          <div class="flex items-center gap-3">
            <div class="text-center">
              <div class="text-xl font-bold text-amber-400">
                {speedMultiplier}x
              </div>
              <div class="text-xs text-gray-500 uppercase tracking-wider">
                Speed
              </div>
            </div>
            <button
              onclick={handleSpeedUpgrade}
              disabled={!canAffordUpgrade}
              class="group relative px-4 py-2 rounded-lg transition-all duration-200 {canAffordUpgrade
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/50 hover:border-amber-400'
                : 'bg-gray-800/50 border border-gray-700 opacity-50 cursor-not-allowed'}"
            >
              <div
                class="text-sm font-semibold {canAffordUpgrade
                  ? 'text-amber-400'
                  : 'text-gray-500'}"
              >
                Upgrade to {speedMultiplier + 1}x
              </div>
              <div
                class="text-xs {canAffordUpgrade
                  ? 'text-amber-500/70'
                  : 'text-gray-600'}"
              >
                {nextUpgradeCost.toLocaleString()} copper
              </div>
            </button>
          </div>
        </div>

        <!-- Miners Section -->
        <div class="px-5 py-3 border-r border-gray-800/50">
          <div class="text-center">
            <div class="text-xl font-bold text-cyan-400">{miners.size}</div>
            <div class="text-xs text-gray-500 uppercase tracking-wider">
              Active Miners
            </div>
          </div>
        </div>

        <!-- Actions Section -->
        <div class="px-5 py-3 flex items-center gap-3">
          {#if miners.size > 0}
            <button
              onclick={handleCancelAllMiners}
              class="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-all"
            >
              Cancel All
            </button>
          {/if}
          <div
            class="flex items-center gap-1.5"
            title={wsConnected ? "Connected" : "Disconnected"}
          >
            <div
              class="w-2 h-2 rounded-full {wsConnected
                ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
                : 'bg-red-500'}"
            ></div>
            <span class="text-xs text-gray-500"
              >{wsConnected ? "Live" : "Offline"}</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Mining grid -->
  <div class="container mx-auto pb-8 px-4">
    <div class="max-w-5xl mx-auto">
      <!-- Grid -->
      <div class="grid grid-cols-4 gap-4">
        {#each gridNodes as node}
          {@const minersOnNode = getMinersOnNode(node.id)}
          {@const nodeTasks = Array.from(miners.entries()).filter(
            ([tid, m]) => m.nodeId === node.id
          )}

          {@const atCapacity = minersOnNode >= MAX_MINERS_PER_NODE}
          <button
            type="button"
            class="relative border-2 rounded-lg p-4 transition-all hover:scale-105 cursor-pointer text-left w-full {minersOnNode >
            0
              ? 'border-green-500 bg-green-950/30 shadow-lg'
              : 'border-gray-600 bg-gray-900/50'} {resources.copper >=
              node.cost && !atCapacity
              ? 'hover:border-cyan-400'
              : 'opacity-60'}"
            style="border-color: {node.color}; box-shadow: {minersOnNode > 0
              ? `0 0 20px ${node.color}40`
              : 'none'};"
            onclick={() => {
              if (atCapacity) {
                alert(`Maximum ${MAX_MINERS_PER_NODE} miners per node!`);
              } else if (resources.copper >= node.cost) {
                handleDeployMiner(node.id);
              } else {
                alert(`Need ${node.cost} Copper to deploy ${node.name} miner`);
              }
            }}
          >
            <!-- Node image -->
            <div class="flex justify-center mb-3">
              <div
                class="relative w-20 h-20 rounded-xl border-2 p-2 bg-gradient-to-br from-black/40 to-black/60 flex items-center justify-center transition-all duration-300 {minersOnNode >
                0
                  ? 'shadow-2xl scale-105'
                  : ''}"
                style="border-color: {minersOnNode > 0
                  ? node.color
                  : '#4b5563'}; box-shadow: {minersOnNode > 0
                  ? `0 0 20px ${node.color}60, inset 0 0 20px ${node.color}20`
                  : 'none'};"
              >
                {#if minersOnNode > 0}
                  <div
                    class="absolute inset-0 rounded-xl opacity-30"
                    style="background: radial-gradient(circle, {node.color} 0%, transparent 70%); animation: pulse 2s ease-in-out infinite;"
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
            <div class="text-center mb-2">
              <div class="text-lg font-bold" style="color: {node.color}">
                {node.name}
              </div>
              <div class="text-xs text-gray-400">
                Yield: {node.yield} | Time: {node.timeMs / 1000}s
              </div>
              {#if node.cost > 0}
                <div class="text-xs text-yellow-400 mt-1">
                  Cost: {node.cost} Copper
                </div>
              {:else}
                <div class="text-xs text-green-400 mt-1">FREE</div>
              {/if}
              <div
                class="text-xs mt-1 {atCapacity
                  ? 'text-red-400'
                  : 'text-gray-500'}"
              >
                {minersOnNode}/{MAX_MINERS_PER_NODE} miners
              </div>
            </div>

            <!-- Miners on this node -->
            {#if minersOnNode > 0}
              <div class="space-y-2 mt-4">
                {#each nodeTasks as [taskId, miner]}
                  {@const progress = getMinerProgress(taskId)}
                  <div
                    class="bg-black/70 rounded p-2 border border-cyan-500/50 relative overflow-hidden"
                  >
                    <!-- Mining animation background -->
                    <div
                      class="absolute inset-0 opacity-10"
                      style="background: linear-gradient(90deg, transparent 0%, {node.color} 50%, transparent 100%); animation: mining-sweep 2s linear infinite;"
                    ></div>

                    <div
                      class="flex items-center justify-between mb-1 relative z-10"
                    >
                      <div class="flex items-center gap-2">
                        <div
                          class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"
                        ></div>
                        <div class="text-xs font-mono">
                          <span class="text-cyan-400">Miner</span>
                          <span class="text-gray-500 ml-1">x{miner.cycle}</span>
                        </div>
                      </div>
                      <div class="flex items-center gap-1.5">
                        {#if getSellValue(taskId) > 0}
                          <span class="text-xs text-yellow-400 font-semibold">
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
                          class="h-6 w-6 text-green-400 hover:bg-green-900/30 transition-all hover:scale-110"
                          title={`Sell for ${getSellValue(taskId).toLocaleString()} Copper`}
                        >
                          <DollarSign class="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <!-- Progress bar -->
                    <div
                      class="w-full h-2 bg-gray-800 rounded overflow-hidden relative z-10"
                    >
                      <div
                        class="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-100"
                        style="width: {progress *
                          100}%; box-shadow: 0 0 8px {node.color};"
                      ></div>
                      <div
                        class="absolute inset-0 bg-white/20"
                        style="animation: shimmer 1.5s infinite;"
                      ></div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Mining animation overlay -->
            {#if minersOnNode > 0}
              <div
                class="absolute inset-0 pointer-events-none opacity-30"
                style="background: radial-gradient(circle, {node.color} 0%, transparent 70%); animation: pulse 2s ease-in-out infinite;"
              ></div>
            {/if}
          </button>
        {/each}
      </div>

      <!-- Instructions -->
      <div class="mt-8 text-center text-gray-400 font-mono text-sm">
        Click a resource node to deploy a miner. Miners loop continuously until
        cancelled.
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes pulse {
    0%,
    100% {
      opacity: 0.2;
    }
    50% {
      opacity: 0.4;
    }
  }

  @keyframes mining-sweep {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
</style>
