import { h as spread_props, z as head, m as escape_html, k as attr, l as attr_class, j as ensure_array_like, v as attr_style, n as stringify, G as run } from "../../../chunks/async.js";
import { s as startTask, g as getTasks } from "../../../chunks/data.remote.js";
import { B as Button } from "../../../chunks/button.js";
import { I as Icon } from "../../../chunks/Icon.js";
function Dollar_sign($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["line", { "x1": "12", "x2": "12", "y1": "2", "y2": "22" }],
      [
        "path",
        { "d": "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" }
      ]
    ];
    Icon($$renderer2, spread_props([
      { name: "dollar-sign" },
      /**
       * @component @name DollarSign
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8bGluZSB4MT0iMTIiIHgyPSIxMiIgeTE9IjIiIHkyPSIyMiIgLz4KICA8cGF0aCBkPSJNMTcgNUg5LjVhMy41IDMuNSAwIDAgMCAwIDdoNWEzLjUgMy41IDAgMCAxIDAgN0g2IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/dollar-sign
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const RESOURCE_NODES = [
      {
        id: "copper",
        name: "Copper Rock",
        yield: 1,
        timeMs: 4e3,
        level: 1,
        cost: 0,
        color: "#cd7f32",
        image: "/copper.png"
      },
      {
        id: "iron",
        name: "Iron Rock",
        yield: 2,
        timeMs: 6e3,
        level: 10,
        cost: 50,
        color: "#808080",
        image: "/iron.png"
      },
      {
        id: "silver",
        name: "Silver Rock",
        yield: 3,
        timeMs: 8e3,
        level: 25,
        cost: 200,
        color: "#c0c0c0",
        image: "/silver.png"
      },
      {
        id: "gold",
        name: "Gold Rock",
        yield: 5,
        timeMs: 1e4,
        level: 40,
        cost: 500,
        color: "#ffd700",
        image: "/gold.png"
      },
      {
        id: "cobalt",
        name: "Cobalt Rock",
        yield: 8,
        timeMs: 12e3,
        level: 55,
        cost: 1e3,
        color: "#0047ab",
        image: "/cobalt.png"
      },
      {
        id: "obsidian",
        name: "Obsidian Rock",
        yield: 12,
        timeMs: 14e3,
        level: 70,
        cost: 2e3,
        color: "#4b0082",
        image: "/obsidian.png"
      },
      {
        id: "astral",
        name: "Astral Rock",
        yield: 18,
        timeMs: 16e3,
        level: 85,
        color: "#87ceeb",
        cost: 5e3,
        image: "/astral.png"
      },
      {
        id: "infernal",
        name: "Infernal Rock",
        yield: 25,
        timeMs: 18e3,
        level: 100,
        color: "#ff4500",
        cost: 1e4,
        image: "/infernal.png"
      }
    ];
    let tasks = [];
    let resources = {};
    let speedMultiplier = 1;
    let now = Date.now();
    const getUpgradeCost = (currentLevel) => Math.floor(500 * Math.pow(4, currentLevel - 1));
    const GRID_COLS = 4;
    const GRID_ROWS = 2;
    const gridNodes = RESOURCE_NODES.slice(0, GRID_COLS * GRID_ROWS).map((node, index) => ({
      ...node,
      row: Math.floor(index / GRID_COLS),
      col: index % GRID_COLS
    }));
    const mission4Tasks = tasks.filter((t) => t.taskId.startsWith("mission4-"));
    const miners = (() => {
      const minerMap = /* @__PURE__ */ new Map();
      for (const task of mission4Tasks) {
        if (task.params?.nodeId && (task.status === "running" || task.status === "pending")) {
          minerMap.set(task.taskId, {
            nodeId: task.params.nodeId,
            startTime: task.startedAt || Date.now(),
            cycle: task.progress?.cycle || 0
          });
        }
      }
      return minerMap;
    })();
    const minerProgress = (() => {
      const progressMap = /* @__PURE__ */ new Map();
      for (const [taskId, miner] of miners.entries()) {
        const node = RESOURCE_NODES.find((n) => n.id === miner.nodeId);
        if (node) {
          const elapsed = now - miner.startTime;
          const progress = elapsed % node.timeMs / node.timeMs;
          progressMap.set(taskId, progress);
        }
      }
      return progressMap;
    })();
    function getMinerProgress(taskId) {
      return minerProgress.get(taskId) || 0;
    }
    function updateResources() {
      const stateTask = tasks.find((t) => t.taskId === "mission4-global-state" || t.taskId === "global-state" && t.params?.namespace === "mission4");
      if (stateTask && stateTask.status === "completed") {
        if (Object.keys(resources).length === 0) resources = { copper: 0 };
        return;
      }
      if (stateTask?.progress?.resources !== void 0) {
        const res = stateTask.progress.resources;
        if (typeof res === "object" && res !== null) {
          resources = res;
        } else if (typeof res === "number") {
          resources = { copper: res };
        }
      } else if (Object.keys(resources).length === 0) {
        resources = { copper: 0 };
      }
      if (stateTask?.progress?.speedMultiplier !== void 0) {
        speedMultiplier = stateTask.progress.speedMultiplier;
      }
    }
    async function loadTasks() {
      try {
        const fetchedTasks = await getTasks("mission4");
        run(() => {
          tasks = fetchedTasks;
        });
        await updateResources();
      } catch (error) {
        console.error("Failed to load tasks:", error);
      }
    }
    const MAX_MINERS_PER_NODE = 5;
    const SELL_MULTIPLIER = 2;
    function getSellValue(taskId) {
      const miner = miners.get(taskId);
      if (!miner) return 0;
      const node = RESOURCE_NODES.find((n) => n.id === miner.nodeId);
      if (!node) return 0;
      const totalGenerated = miner.cycle * node.yield;
      return totalGenerated * SELL_MULTIPLIER;
    }
    async function handleSellMiner(taskId) {
      const miner = miners.get(taskId);
      if (!miner) return;
      const sellValue = getSellValue(taskId);
      if (sellValue === 0) {
        alert("This miner hasn't generated any resources yet!");
        return;
      }
      if (!await confirm(`Sell miner for ${sellValue.toLocaleString()} Copper?`)) {
        return;
      }
      try {
        await startTask({
          taskName: "sell-miner",
          namespace: "mission4",
          taskIdToCancel: taskId,
          copperToAdd: sellValue
        });
        await loadTasks();
      } catch (error) {
        console.error("Failed to sell miner:", error);
        alert("Failed to sell miner: " + (error instanceof Error ? error.message : String(error)));
      }
    }
    function getMinersOnNode(nodeId) {
      return Array.from(miners.values()).filter((m) => m.nodeId === nodeId).length;
    }
    const copperPerSecond = (() => {
      let total = 0;
      for (const miner of miners.values()) {
        const node = RESOURCE_NODES.find((n) => n.id === miner.nodeId);
        if (node) {
          total += node.yield / node.timeMs * 1e3 * speedMultiplier;
        }
      }
      return total;
    })();
    const nextUpgradeCost = getUpgradeCost(speedMultiplier);
    const canAffordUpgrade = (resources.copper || 0) >= nextUpgradeCost;
    head("fo0yqp", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Mining Game - ironalarm</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen bg-black text-white p-4 space-y-4 svelte-fo0yqp"><div class="max-w-5xl mx-auto svelte-fo0yqp"><div class="bg-gray-950 border border-gray-800 rounded-xl shadow-2xl svelte-fo0yqp"><div class="flex items-stretch svelte-fo0yqp"><div class="flex-1 px-5 py-3 border-r border-gray-800/50 svelte-fo0yqp"><div class="flex items-baseline gap-3 svelte-fo0yqp"><div class="flex items-center gap-2 svelte-fo0yqp"><div class="w-3 h-3 rounded-sm svelte-fo0yqp" style="background: #cd7f32; box-shadow: 0 0 8px #cd7f32;"></div> <span class="text-2xl font-bold tabular-nums text-white svelte-fo0yqp">${escape_html((resources.copper || 0).toLocaleString())}</span></div> `);
    if (copperPerSecond > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="text-sm text-emerald-400 font-medium svelte-fo0yqp">+${escape_html(copperPerSecond.toFixed(1))}/s</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="text-xs text-gray-500 mt-0.5 uppercase tracking-wider svelte-fo0yqp">Copper</div></div> <div class="px-5 py-3 border-r border-gray-800/50 svelte-fo0yqp"><div class="flex items-center gap-3 svelte-fo0yqp"><div class="text-center svelte-fo0yqp"><div class="text-xl font-bold text-amber-400 svelte-fo0yqp">${escape_html(speedMultiplier)}x</div> <div class="text-xs text-gray-500 uppercase tracking-wider svelte-fo0yqp">Speed</div></div> <button${attr("disabled", !canAffordUpgrade, true)}${attr_class(
      `group relative px-4 py-2 rounded-lg transition-all duration-200 ${stringify(canAffordUpgrade ? "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/50 hover:border-amber-400" : "bg-gray-800/50 border border-gray-700 opacity-50 cursor-not-allowed")}`,
      "svelte-fo0yqp"
    )}><div${attr_class(`text-sm font-semibold ${stringify(canAffordUpgrade ? "text-amber-400" : "text-gray-500")}`, "svelte-fo0yqp")}>Upgrade to ${escape_html(speedMultiplier + 1)}x</div> <div${attr_class(`text-xs ${stringify(canAffordUpgrade ? "text-amber-500/70" : "text-gray-600")}`, "svelte-fo0yqp")}>${escape_html(nextUpgradeCost.toLocaleString())} copper</div></button></div></div> <div class="px-5 py-3 border-r border-gray-800/50 svelte-fo0yqp"><div class="text-center svelte-fo0yqp"><div class="text-xl font-bold text-cyan-400 svelte-fo0yqp">${escape_html(miners.size)}</div> <div class="text-xs text-gray-500 uppercase tracking-wider svelte-fo0yqp">Active Miners</div></div></div> <div class="px-5 py-3 flex items-center gap-3 svelte-fo0yqp">`);
    if (miners.size > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-all svelte-fo0yqp">Cancel All</button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="flex items-center gap-1.5 svelte-fo0yqp"${attr("title", "Disconnected")}><div${attr_class(
      `w-2 h-2 rounded-full ${stringify("bg-red-500")}`,
      "svelte-fo0yqp"
    )}></div> <span class="text-xs text-gray-500 svelte-fo0yqp">${escape_html("Offline")}</span></div></div></div></div></div> <div class="container mx-auto pb-8 px-4 svelte-fo0yqp"><div class="max-w-5xl mx-auto svelte-fo0yqp"><div class="grid grid-cols-4 gap-4 svelte-fo0yqp"><!--[-->`);
    const each_array = ensure_array_like(gridNodes);
    for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
      let node = each_array[$$index_1];
      const minersOnNode = getMinersOnNode(node.id);
      const nodeTasks = Array.from(miners.entries()).filter(([tid, m]) => m.nodeId === node.id);
      const atCapacity = minersOnNode >= MAX_MINERS_PER_NODE;
      $$renderer2.push(`<button type="button"${attr_class(
        `relative border-2 rounded-lg p-4 transition-all hover:scale-105 cursor-pointer text-left w-full ${stringify(minersOnNode > 0 ? "border-green-500 bg-green-950/30 shadow-lg" : "border-gray-600 bg-gray-900/50")} ${stringify(resources.copper >= node.cost && !atCapacity ? "hover:border-cyan-400" : "opacity-60")}`,
        "svelte-fo0yqp"
      )}${attr_style(`border-color: ${stringify(node.color)}; box-shadow: ${stringify(minersOnNode > 0 ? `0 0 20px ${node.color}40` : "none")};`)}><div class="flex justify-center mb-3 svelte-fo0yqp"><div${attr_class(`relative w-20 h-20 rounded-xl border-2 p-2 bg-gradient-to-br from-black/40 to-black/60 flex items-center justify-center transition-all duration-300 ${stringify(minersOnNode > 0 ? "shadow-2xl scale-105" : "")}`, "svelte-fo0yqp")}${attr_style(`border-color: ${stringify(minersOnNode > 0 ? node.color : "#4b5563")}; box-shadow: ${stringify(minersOnNode > 0 ? `0 0 20px ${node.color}60, inset 0 0 20px ${node.color}20` : "none")};`)}>`);
      if (minersOnNode > 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="absolute inset-0 rounded-xl opacity-30 svelte-fo0yqp"${attr_style(`background: radial-gradient(circle, ${stringify(node.color)} 0%, transparent 70%); animation: pulse 2s ease-in-out infinite;`)}></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <img${attr("src", node.image)}${attr("alt", node.name)}${attr_class(`relative z-10 w-full h-full object-contain drop-shadow-2xl filter ${stringify(minersOnNode > 0 ? "brightness-110" : "")}`, "svelte-fo0yqp")}/></div></div> <div class="text-center mb-2 svelte-fo0yqp"><div class="text-lg font-bold svelte-fo0yqp"${attr_style(`color: ${stringify(node.color)}`)}>${escape_html(node.name)}</div> <div class="text-xs text-gray-400 svelte-fo0yqp">Yield: ${escape_html(node.yield)} | Time: ${escape_html(node.timeMs / 1e3)}s</div> `);
      if (node.cost > 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="text-xs text-yellow-400 mt-1 svelte-fo0yqp">Cost: ${escape_html(node.cost)} Copper</div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="text-xs text-green-400 mt-1 svelte-fo0yqp">FREE</div>`);
      }
      $$renderer2.push(`<!--]--> <div${attr_class(`text-xs mt-1 ${stringify(atCapacity ? "text-red-400" : "text-gray-500")}`, "svelte-fo0yqp")}>${escape_html(minersOnNode)}/5 miners</div></div> `);
      if (minersOnNode > 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="space-y-2 mt-4 svelte-fo0yqp"><!--[-->`);
        const each_array_1 = ensure_array_like(nodeTasks);
        for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
          let [taskId, miner] = each_array_1[$$index];
          const progress = getMinerProgress(taskId);
          $$renderer2.push(`<div class="bg-black/70 rounded p-2 border border-cyan-500/50 relative overflow-hidden svelte-fo0yqp"><div class="absolute inset-0 opacity-10 svelte-fo0yqp"${attr_style(`background: linear-gradient(90deg, transparent 0%, ${stringify(node.color)} 50%, transparent 100%); animation: mining-sweep 2s linear infinite;`)}></div> <div class="flex items-center justify-between mb-1 relative z-10 svelte-fo0yqp"><div class="flex items-center gap-2 svelte-fo0yqp"><div class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse svelte-fo0yqp"></div> <div class="text-xs font-mono svelte-fo0yqp"><span class="text-cyan-400 svelte-fo0yqp">Miner</span> <span class="text-gray-500 ml-1 svelte-fo0yqp">x${escape_html(miner.cycle)}</span></div></div> <div class="flex items-center gap-1.5 svelte-fo0yqp">`);
          if (getSellValue(taskId) > 0) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<span class="text-xs text-yellow-400 font-semibold svelte-fo0yqp">${escape_html(getSellValue(taskId).toLocaleString())}</span>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--> `);
          Button($$renderer2, {
            size: "icon",
            variant: "ghost",
            onclick: (e) => {
              e.stopPropagation();
              handleSellMiner(taskId);
            },
            class: "h-6 w-6 text-green-400 hover:bg-green-900/30 transition-all hover:scale-110",
            title: `Sell for ${getSellValue(taskId).toLocaleString()} Copper`,
            children: ($$renderer3) => {
              Dollar_sign($$renderer3, { class: "w-3 h-3" });
            },
            $$slots: { default: true }
          });
          $$renderer2.push(`<!----></div></div> <div class="w-full h-2 bg-gray-800 rounded overflow-hidden relative z-10 svelte-fo0yqp"><div class="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-100 svelte-fo0yqp"${attr_style(`width: ${stringify(progress * 100)}%; box-shadow: 0 0 8px ${stringify(node.color)};`)}></div> <div class="absolute inset-0 bg-white/20 svelte-fo0yqp" style="animation: shimmer 1.5s infinite;"></div></div></div>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (minersOnNode > 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="absolute inset-0 pointer-events-none opacity-30 svelte-fo0yqp"${attr_style(`background: radial-gradient(circle, ${stringify(node.color)} 0%, transparent 70%); animation: pulse 2s ease-in-out infinite;`)}></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></button>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="mt-8 text-center text-gray-400 font-mono text-sm svelte-fo0yqp">Click a resource node to deploy a miner. Miners loop continuously until
        cancelled.</div></div></div></div>`);
  });
}
export {
  _page as default
};
