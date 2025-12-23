<script lang="ts">
  import { page } from "$app/state";
  import Github from "@lucide/svelte/icons/github";
  import Menu from "@lucide/svelte/icons/menu";
  import X from "@lucide/svelte/icons/x";

  let currentPath = $derived(page.url.pathname);
  let mobileMenuOpen = $state(false);

  const navItems = [
    {
      href: "/docs",
      label: "Docs",
      isActive: (path: string) =>
        path.startsWith("/docs") && path !== "/docs/api",
    },
    {
      href: "/docs/api",
      label: "API",
      isActive: (path: string) => path === "/docs/api",
    },
    {
      href: "/mission",
      label: "Mission Control",
      isActive: (path: string) => path === "/mission",
    },
  ];

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }
</script>

<nav
  class="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl"
>
  <div
    class="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between"
  >
    <div class="flex items-center gap-3">
      <div
        class="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center"
      >
        <svg
          class="w-4 h-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width={2.5}
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <a
        href="/"
        class="font-semibold tracking-tight text-zinc-100 hover:text-zinc-200 transition-colors"
      >
        ironalarm
      </a>
    </div>

    <!-- Desktop Navigation -->
    <div class="hidden md:flex items-center gap-6">
      {#each navItems as item}
        <a
          href={item.href}
          class="text-sm text-zinc-400 hover:text-zinc-200 transition-colors {item.isActive(
            currentPath
          )
            ? 'text-zinc-200'
            : ''}"
        >
          {item.label}
        </a>
      {/each}
      <a
        href="https://github.com/acoyfellow/ironalarm"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
      >
        <Github class="w-4 h-4" />
        <span>GitHub</span>
      </a>
    </div>

    <!-- Mobile Menu Button -->
    <button
      type="button"
      class="md:hidden text-zinc-400 hover:text-zinc-200 transition-colors"
      onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
      aria-label="Toggle menu"
    >
      {#if mobileMenuOpen}
        <X class="w-6 h-6" />
      {:else}
        <Menu class="w-6 h-6" />
      {/if}
    </button>
  </div>

  <!-- Mobile Menu -->
  {#if mobileMenuOpen}
    <div
      class="md:hidden border-t border-zinc-800/50 bg-zinc-950/95 backdrop-blur-xl"
    >
      <div class="px-4 py-4 space-y-4">
        {#each navItems as item}
          <a
            href={item.href}
            onclick={closeMobileMenu}
            class="block text-sm text-zinc-400 hover:text-zinc-200 transition-colors {item.isActive(
              currentPath
            )
              ? 'text-zinc-200'
              : ''}"
          >
            {item.label}
          </a>
        {/each}
        <a
          href="https://github.com/acoyfellow/ironalarm"
          target="_blank"
          rel="noopener noreferrer"
          onclick={closeMobileMenu}
          class="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Github class="w-4 h-4" />
          <span>GitHub</span>
        </a>
      </div>
    </div>
  {/if}
</nav>
