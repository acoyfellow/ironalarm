<script lang="ts">
  import "../app.css";
  import { authStore } from "$lib/auth-store.svelte";
  import Nav from "$lib/components/Nav.svelte";
  import { page } from "$app/state";
  import { browser } from "$app/environment";
  import Alert from "$lib/components/Alert.svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";

  let { data, children } = $props();

  $effect(() => {
    authStore.initialize(data.user, data.session);
  });
</script>

<Tooltip.Provider>
  <div class="min-h-screen bg-zinc-950 text-zinc-100">
    <Nav />
    {@render children()}
    <Alert />
  </div>
</Tooltip.Provider>
