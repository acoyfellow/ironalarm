<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { afterNavigate } from "$app/navigation";
  import { cubicOut } from "svelte/easing";
  import { startTask, getTasks, cancelTask } from "$routes/data.remote";
  import { createWebSocket } from "$lib/websocket-service";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import MoreVertical from "@lucide/svelte/icons/more-vertical";
  import ResourceVelocity from "$lib/components/ResourceVelocity.svelte";
  import Particle from "$lib/components/Particle.svelte";
  import NodeCard from "$lib/components/NodeCard.svelte";

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

  // Motion configuration objects
  const numberTweenConfig = {
    duration: 400,
    easing: cubicOut,
  };

  const colorTweenConfig = {
    duration: 1000,
    easing: cubicOut,
  };

  const defaultSpringConfig = {
    stiffness: 0.1,
    damping: 0.4,
  };

  const bouncySpringConfig = {
    stiffness: 0.2,
    damping: 0.3,
  };

  let wsConnected = $state(false);
  let wsClose: (() => void) | null = null;
  // Accept initial data from server load
  let { data }: { data: { tasks: any[] } } = $props();

  let tasks = $derived(data?.tasks || []);
  let resources = $state<Record<string, number>>({});
  let speedMultiplier = $state(1);
  let now = $state(Date.now());

  // Floating number system
  interface FloatingNumberData {
    id: string;
    value: number;
    x: number;
    y: number;
    color: string;
    multiplier?: number;
  }

  let floatingNumbers = $state<FloatingNumberData[]>([]);
  let previousResources = $state<Record<string, number>>({});
  let previousResourcesRef = { ...previousResources }; // Non-reactive copy for comparison

  // Critical hit system
  interface CriticalHitData {
    id: string;
    multiplier: number;
    x: number;
    y: number;
    timestamp: number;
  }

  let criticalHits = $state<CriticalHitData[]>([]);

  // Particle system
  interface ParticleData {
    id: string;
    color: string;
    angle: number;
    distance: number;
    x: number;
    y: number;
  }

  let particles = $state<ParticleData[]>([]);

  function triggerParticleBurst(
    element: HTMLElement | null,
    color: string = "#fbbf24",
    count: number = 10
  ) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const distance = 50 + Math.random() * 30;
      const id = crypto.randomUUID();
      particles = [
        ...particles,
        { id, color, angle, distance, x: centerX, y: centerY },
      ];

      // Remove after animation
      setTimeout(() => {
        particles = particles.filter((p) => p.id !== id);
      }, 1000);
    }
  }

  // Resource velocity system
  let resourceVelocity = $state(0);
  let lastResourceCheck = $state(Date.now());
  let lastResourceCount = $state(0);

  function triggerCriticalHit(x: number, y: number) {
    // 5% chance for critical hit
    if (Math.random() > 0.05) return;

    const multipliers = [2, 3, 5];
    const multiplier =
      multipliers[Math.floor(Math.random() * multipliers.length)];

    const id = crypto.randomUUID();
    criticalHits = [
      ...criticalHits,
      { id, multiplier, x, y, timestamp: Date.now() },
    ];

    // Remove after animation
    setTimeout(() => {
      criticalHits = criticalHits.filter((h) => h.id !== id);
    }, 1500);
  }

  function addFloatingNumber(
    value: number,
    x: number,
    y: number,
    color: string,
    multiplier?: number
  ) {
    // Limit to 10 simultaneous floating numbers
    if (floatingNumbers.length >= 10) {
      floatingNumbers = floatingNumbers.slice(1);
    }

    const id = crypto.randomUUID();
    floatingNumbers = [
      ...floatingNumbers,
      { id, value, x, y, color, multiplier },
    ];

    // Auto-remove after animation
    setTimeout(() => {
      floatingNumbers = floatingNumbers.filter((n) => n.id !== id);
    }, 2000);
  }

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

  // Track resource changes and trigger floating numbers
  $effect(() => {
    const currentCopper = resources.copper || 0;
    const previousCopper = previousResourcesRef.copper || 0;

    if (currentCopper > previousCopper && previousCopper > 0) {
      const diff = currentCopper - previousCopper;
      // Get position of copper display (approximate center of header)
      const x = window.innerWidth / 2;
      const y = 100; // Approximate position of resource display
      addFloatingNumber(diff, x, y, "#cd7f32");
      // Trigger critical hit chance
      triggerCriticalHit(x, y - 50);
    }

    // Calculate resource velocity
    const now = Date.now();
    const timeDelta = (now - lastResourceCheck) / 1000; // seconds
    if (timeDelta > 0) {
      const resourceDelta = currentCopper - lastResourceCount;
      resourceVelocity = resourceDelta / timeDelta; // per second
      lastResourceCheck = now;
      lastResourceCount = currentCopper;
    }

    // Update non-reactive ref (doesn't trigger effect)
    previousResourcesRef = { ...resources };
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

  async function handleBuyMaxMiners(nodeId: string) {
    const node = RESOURCE_NODES.find((n) => n.id === nodeId);
    if (!node) return;

    const currentMiners = getMinersOnNode(nodeId);
    const availableSlots = MAX_MINERS_PER_NODE - currentMiners;
    if (availableSlots <= 0) {
      alert(`Maximum ${MAX_MINERS_PER_NODE} miners per node!`);
      return;
    }

    const currentCopper = resources.copper || 0;
    if (currentCopper < node.cost) {
      alert(
        `Need ${node.cost} Copper to deploy ${node.name} miner. You have ${currentCopper}.`
      );
      return;
    }

    // Calculate how many we can afford
    const affordable = Math.floor(currentCopper / node.cost);
    const toBuy = Math.min(availableSlots, affordable);

    if (toBuy === 0) {
      alert(`Cannot afford any ${node.name} miners.`);
      return;
    }

    const totalCost = toBuy * node.cost;

    // Buy miners one by one
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < toBuy; i++) {
      try {
        await startTask({
          taskName: "mine-resource-loop",
          nodeId,
          namespace: "mission4",
          yield: node.yield,
          timeMs: node.timeMs,
          cost: node.cost,
        });
        successCount++;
        // Small delay to avoid overwhelming the server
        await new Promise((r) => setTimeout(r, 50));
      } catch (error) {
        console.error(`Failed to deploy miner ${i + 1}/${toBuy}:`, error);
        failCount++;
      }
    }

    await loadTasks();

    if (failCount > 0) {
      alert(
        `Bought ${successCount} miner${successCount > 1 ? "s" : ""}, ${failCount} failed.`
      );
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

  // Calculate sell value: original cost + (cycles * yield * multiplier)
  const SELL_MULTIPLIER = 2; // Each cycle's yield is worth 2x when sold

  function getSellValue(taskId: string): number {
    const miner = miners.get(taskId);
    if (!miner) return 0;

    const node = RESOURCE_NODES.find((n) => n.id === miner.nodeId);
    if (!node) return 0;

    // Base value = original purchase cost (full refund)
    const baseCost = node.cost;
    // Bonus = cycles * yield * multiplier
    const bonus = miner.cycle * node.yield * SELL_MULTIPLIER;
    return baseCost + bonus;
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

  // Calculate total sell value for all miners on a node
  function getTotalSellValueForNode(nodeId: string): number {
    const minerTaskIds = Array.from(miners.entries())
      .filter(
        ([id, m]) => id !== "mission4-global-state" && m.nodeId === nodeId
      )
      .map(([id]) => id);

    let totalValue = 0;
    for (const taskId of minerTaskIds) {
      totalValue += getSellValue(taskId);
    }
    return totalValue;
  }

  // ROI calculation: Higher tier = better ROI (incentivizes progression)
  // ROI is tier-based: higher tier nodes have better ROI scores
  // This encourages players to progress to better nodes
  function getEfficiencyScore(nodeId: string): number {
    const node = RESOURCE_NODES.find((n) => n.id === nodeId);
    if (!node) return 0;
    const minersOnNode = getMinersOnNode(nodeId);
    if (minersOnNode === 0) return 0;

    // Find tier index (0 = copper, 7 = infernal)
    const tierIndex = RESOURCE_NODES.findIndex((n) => n.id === nodeId);
    if (tierIndex === -1) return 0;

    // Base ROI increases with tier: tier 0 = 1.0, tier 7 = 8.0
    // This makes higher tiers have better ROI
    const baseROI = 1.0 + tierIndex * 1.0;

    // Scale by yield per second to account for actual production
    const yieldPerSecond = (node.yield / node.timeMs) * 1000 * speedMultiplier;
    const yieldMultiplier = yieldPerSecond / 0.25; // Normalize to copper's base yield

    // Final ROI = base tier ROI * yield multiplier
    // Higher tiers get both a base bonus and yield bonus
    return baseROI * yieldMultiplier * 10; // Scale for display
  }

  // Efficiency color mapping
  function getEfficiencyColor(score: number): string {
    if (score > 50) return "#10b981"; // Green - very efficient
    if (score > 20) return "#84cc16"; // Lime - efficient
    if (score > 10) return "#eab308"; // Yellow - moderate
    if (score > 5) return "#f97316"; // Orange - low
    return "#ef4444"; // Red - very low
  }

  // Projected earnings calculation
  function getProjectedEarnings(
    nodeId: string,
    timeSeconds: number = 60
  ): number {
    const node = RESOURCE_NODES.find((n) => n.id === nodeId);
    if (!node) return 0;
    const minersOnNode = getMinersOnNode(nodeId);
    const yieldPerSecond = (node.yield / node.timeMs) * 1000 * speedMultiplier;
    return yieldPerSecond * minersOnNode * timeSeconds;
  }

  // Synergy calculation (visual only)
  function getSynergyBonus(nodeId: string): number {
    const totalMiners = miners.size;
    const synergy = 1 + totalMiners * 0.01;
    return Math.min(synergy, 1.5); // Cap at 1.5x
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

  async function handleSellAllMinersOnNode(nodeId: string) {
    const minerTaskIds = Array.from(miners.entries())
      .filter(
        ([id, m]) => id !== "mission4-global-state" && m.nodeId === nodeId
      )
      .map(([id]) => id);
    if (minerTaskIds.length === 0) return;

    let totalValue = 0;
    for (const taskId of minerTaskIds) {
      totalValue += getSellValue(taskId);
    }

    const node = RESOURCE_NODES.find((n) => n.id === nodeId);
    if (
      !(await confirm(
        `Sell all ${minerTaskIds.length} ${node?.name || nodeId} miners for ${totalValue.toLocaleString()} copper?`
      ))
    )
      return;

    for (const taskId of minerTaskIds) {
      const sellValue = getSellValue(taskId);
      if (sellValue > 0) {
        await startTask({
          taskName: "sell-miner",
          namespace: "mission4",
          taskIdToCancel: taskId,
          copperToAdd: sellValue,
        });
      } else {
        await cancelTask(taskId);
      }
    }
    await loadTasks();
  }

  async function handleSellAllMiners() {
    const minerTaskIds = Array.from(miners.keys()).filter(
      (id) => id !== "mission4-global-state"
    );
    if (minerTaskIds.length === 0) return;

    // Calculate total sell value using same logic as individual sell
    let totalValue = 0;
    for (const taskId of minerTaskIds) {
      totalValue += getSellValue(taskId);
    }

    if (totalValue === 0) {
      alert("No miners have generated resources yet!");
      return;
    }

    if (
      !(await confirm(
        `Sell all ${minerTaskIds.length} miners for ${totalValue.toLocaleString()} copper?`
      ))
    )
      return;

    // Sell each miner
    for (const taskId of minerTaskIds) {
      const sellValue = getSellValue(taskId);
      if (sellValue > 0) {
        await startTask({
          taskName: "sell-miner",
          namespace: "mission4",
          taskIdToCancel: taskId,
          copperToAdd: sellValue,
        });
      } else {
        // Just cancel miners with no value
        await cancelTask(taskId);
      }
    }
    await loadTasks();
  }

  onMount(() => {
    // Tasks are already loaded from server, just start WebSocket and initialize resources
    updateResources();

    // WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = import.meta.env.DEV
      ? "localhost:1337"
      : "ironalarm-api.coey.dev";
    const wsUrl = `${protocol}//${host}/ws`;

    let wsDisconnectedTime: number | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const startPollingFallback = () => {
      if (pollInterval) return;
      pollInterval = setInterval(() => {
        if (
          !wsConnected &&
          wsDisconnectedTime &&
          Date.now() - wsDisconnectedTime > 5000
        ) {
          loadTasks();
        }
      }, 2000);
    };

    const stopPollingFallback = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      wsDisconnectedTime = null;
    };

    const ws = createWebSocket(
      wsUrl,
      (message) => {
        if (message.type === "tasks") {
          untrack(() => {
            tasks = message.data.filter(
              (t: any) =>
                t.taskId.startsWith("mission4-") ||
                t.taskId === "mission4-global-state" ||
                (t.taskId === "global-state" && t.params?.namespace === "mission4")
            );
          });
        } else if (
          message.type === "resources" &&
          message.data?.namespace === "mission4"
        ) {
          console.log("[Client] Received resources:", message.data.resources);
          // Direct assignment - no untrack, we WANT reactivity
          resources = message.data.resources || { copper: 0 };
          speedMultiplier = message.data.speedMultiplier || 1;
        }
      },
      () => {
        wsConnected = true;
        stopPollingFallback();
      },
      () => {
        wsConnected = false;
        wsDisconnectedTime = Date.now();
        startPollingFallback();
      }
    );
    wsClose = ws.close;

    // Initialize global state
    const initGlobalState = async () => {
      try {
        const globalTask = tasks.find(
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

    // WebSocket handles real-time updates - polling only as fallback if disconnected >5s
    // (pollInterval is managed by WebSocket connection handlers above)

    return () => {
      clearInterval(progressInterval);
      stopPollingFallback();
      wsClose?.();
    };
  });

  // Reload tasks when navigating back to this page
  afterNavigate(({ to, from }) => {
    // Only reload if we're navigating TO the mission page
    if (to?.url.pathname === "/mission" && from?.url.pathname !== "/mission") {
      // Small delay to ensure WebSocket has time to reconnect
      setTimeout(() => {
        loadTasks();
        // Also ensure resources are updated
        updateResources();
      }, 200);
    }
  });
</script>

<svelte:head>
  <title>Mining Game - ironalarm</title>
</svelte:head>

<!-- Particles Overlay -->
<div class="fixed inset-0 pointer-events-none z-9997 overflow-hidden">
  {#each particles as particle}
    <Particle
      color={particle.color}
      angle={particle.angle}
      distance={particle.distance}
      x={particle.x}
      y={particle.y}
    />
  {/each}
</div>

<div
  class="min-h-screen bg-black text-white p-2 sm:p-6 space-y-3 sm:space-y-6 overflow-x-clip"
>
  <!-- Game HUD - Mobile optimized -->
  <div class="max-w-5xl mx-auto">
    <div class="bg-gray-950 border border-gray-800 rounded-xl shadow-2xl">
      <!-- Mobile: Compact 2-row layout -->
      <div class="sm:hidden">
        <!-- Row 1: Resources + Stats -->
        <div
          class="flex items-center justify-between px-3 py-2.5 border-b border-gray-800/50"
        >
          <!-- Copper -->
          <div class="flex items-center gap-2">
            <div
              class="w-2.5 h-2.5 rounded-sm shrink-0"
              style="background: #cd7f32; box-shadow: 0 0 6px #cd7f32;"
            ></div>
            <span class="text-xl font-bold tabular-nums text-white"
              >{(resources.copper || 0).toLocaleString()}</span
            >
            {#if copperPerSecond > 0}
              <span class="text-xs text-emerald-400 font-semibold"
                >+{copperPerSecond.toFixed(1)}/s</span
              >
            {/if}
          </div>
          <!-- Speed + Miners compact -->
          <div class="flex items-center gap-3">
            <div class="text-center">
              <div class="text-lg font-bold text-amber-400">
                {speedMultiplier}x
              </div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold text-cyan-400">{miners.size}</div>
            </div>
            <div
              class="w-2 h-2 rounded-full shrink-0 {wsConnected
                ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
                : 'bg-red-500'}"
              title={wsConnected ? "Connected" : "Disconnected"}
            ></div>
          </div>
        </div>
        <!-- Row 2: Actions -->
        <div class="flex items-center gap-2 px-3 py-2">
          <button
            onclick={handleSpeedUpgrade}
            disabled={!canAffordUpgrade}
            class="flex-1 py-2 px-3 rounded-lg text-center transition-all {canAffordUpgrade
              ? 'bg-amber-500/10 border border-amber-500/50 active:bg-amber-500/30'
              : 'bg-gray-800/50 border border-gray-700 opacity-50'}"
          >
            <span
              class="text-xs font-semibold tabular-nums {canAffordUpgrade
                ? 'text-amber-400'
                : 'text-gray-500'}"
            >
              {speedMultiplier + 1}x for {nextUpgradeCost.toLocaleString()}
            </span>
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button
                size="icon"
                variant="ghost"
                class="h-9 w-9 text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <MoreVertical class="w-4 h-4" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="!bg-gray-900 border-gray-700">
              <DropdownMenu.Label class="text-gray-400"
                >Actions</DropdownMenu.Label
              >
              {#if miners.size > 0}
                <DropdownMenu.Item
                  class="text-amber-400 hover:!bg-amber-500/20 cursor-pointer"
                  onclick={handleSellAllMiners}
                >
                  Sell All Miners ({miners.size})
                </DropdownMenu.Item>
              {:else}
                <DropdownMenu.Item class="text-gray-500" disabled>
                  No miners to sell
                </DropdownMenu.Item>
              {/if}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>

      <!-- Desktop: Original horizontal layout -->
      <div class="hidden sm:flex flex-row items-stretch">
        <!-- Resource Section -->
        <div class="flex-1 px-6 py-4 border-r border-gray-800/50">
          <div class="flex items-baseline gap-4">
            <div class="flex items-center gap-2.5">
              <div
                class="w-3.5 h-3.5 rounded-sm"
                style="background: #cd7f32; box-shadow: 0 0 8px #cd7f32;"
              ></div>
              <span
                class="text-3xl font-bold tabular-nums text-white leading-none min-w-[4ch]"
                >{(resources.copper || 0).toLocaleString()}</span
              >
            </div>
            <ResourceVelocity velocity={resourceVelocity} />
            {#if copperPerSecond > 0}
              <span
                class="text-base text-emerald-400 font-semibold tabular-nums"
                >+{copperPerSecond.toFixed(1)}/s</span
              >
            {/if}
          </div>
          <div class="flex items-center gap-3 mt-1.5">
            <span
              class="text-xs text-gray-500 uppercase tracking-wider font-medium"
              >Copper</span
            >
            <span class="text-xs text-cyan-400/70 tabular-nums"
              >{miners.size} active miners</span
            >
          </div>
        </div>

        <!-- Speed Upgrade Section -->
        <div class="px-6 py-4 border-r border-gray-800/50">
          <div class="flex items-center gap-4">
            <div>
              <div
                class="text-3xl font-bold text-amber-400 leading-none tabular-nums"
              >
                {speedMultiplier}x
              </div>
              <div
                class="text-xs text-gray-500 uppercase tracking-wider mt-1.5 font-medium"
              >
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
                class="text-sm font-semibold tabular-nums {canAffordUpgrade
                  ? 'text-amber-400'
                  : 'text-gray-500'}"
              >
                Upgrade to {speedMultiplier + 1}x
              </div>
              <div
                class="text-xs tabular-nums {canAffordUpgrade
                  ? 'text-amber-500/70'
                  : 'text-gray-600'}"
              >
                {nextUpgradeCost.toLocaleString()} copper
              </div>
            </button>
          </div>
        </div>

        <!-- Actions Section -->
        <div class="px-6 py-4 flex items-center gap-4">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button
                size="icon"
                variant="ghost"
                class="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <MoreVertical class="w-4 h-4" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="!bg-gray-900 border-gray-700">
              <DropdownMenu.Label class="text-gray-400"
                >Actions</DropdownMenu.Label
              >
              {#if miners.size > 0}
                <DropdownMenu.Item
                  class="text-amber-400 hover:!bg-amber-500/20 cursor-pointer"
                  onclick={handleSellAllMiners}
                >
                  Sell All Miners ({miners.size})
                </DropdownMenu.Item>
              {:else}
                <DropdownMenu.Item class="text-gray-500" disabled>
                  No miners to sell
                </DropdownMenu.Item>
              {/if}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
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
  <div class="container mx-auto pb-6 sm:pb-8 px-3 sm:px-6">
    <div class="max-w-5xl mx-auto">
      <!-- Grid -->
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      >
        {#each gridNodes as node}
          {@const minersOnNode = getMinersOnNode(node.id)}
          {@const nodeTasks = Array.from(miners.entries()).filter(
            ([tid, m]) => m.nodeId === node.id
          )}
          {@const efficiency = getEfficiencyScore(node.id)}
          {@const efficiencyColor = getEfficiencyColor(efficiency)}
          {@const atCapacity = minersOnNode >= MAX_MINERS_PER_NODE}
          {@const projectedEarnings =
            minersOnNode > 0 ? getProjectedEarnings(node.id) : 0}
          {@const synergy = getSynergyBonus(node.id)}
          {@const totalSellValue = getTotalSellValueForNode(node.id)}

          <NodeCard
            {node}
            {minersOnNode}
            {atCapacity}
            {efficiencyColor}
            {efficiency}
            {projectedEarnings}
            {synergy}
            {totalSellValue}
            {nodeTasks}
            {getMinerProgress}
            {getSellValue}
            {handleSellMiner}
            {handleBuyMaxMiners}
            {handleSellAllMinersOnNode}
            {handleDeployMiner}
            {triggerParticleBurst}
            {resources}
            {MAX_MINERS_PER_NODE}
          />
        {/each}
      </div>

      <!-- Instructions -->
      <div
        class="mt-6 sm:mt-8 text-center text-gray-400 font-mono text-xs sm:text-sm px-2 text-balance"
      >
        Click a resource node to deploy a miner. Miners loop continuously until
        cancelled.
      </div>
    </div>
  </div>
</div>

<style>
  /* Improve touch interactions on mobile */
  button {
    touch-action: manipulation;
  }
</style>
