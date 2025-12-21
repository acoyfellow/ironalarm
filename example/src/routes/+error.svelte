<script lang="ts">
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";

  import Home from "@lucide/svelte/icons/home";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import RefreshCcw from "@lucide/svelte/icons/refresh-ccw";
  import SEO from "$lib/components/SEO.svelte";

  function getErrorTitle(status: number): string {
    switch (status) {
      case 404:
        return "Page Not Found";
      case 403:
        return "Access Denied";
      case 500:
        return "Server Error";
      default:
        return "Error";
    }
  }

  function getErrorDescription(status: number): string {
    switch (status) {
      case 404:
        return "The page you're looking for couldn't be found. It might have been moved or deleted.";
      case 403:
        return "You don't have permission to access this page. Please check your credentials.";
      case 500:
        return "Something went wrong on our end. Our team has been notified and we're working to fix it.";
      default:
        return "We're having trouble loading this page. You can try refreshing or going back to where you were.";
    }
  }

  // Use generic error messages instead of exposing raw error details
  let errorTitle = $derived(`${page.status} - ${getErrorTitle(page.status)}`);
  let errorMessage = $derived(getErrorTitle(page.status));
  let errorDescription = $derived(getErrorDescription(page.status));
</script>

<SEO
  title={errorTitle}
  description={errorDescription}
  keywords="error, not found, problem, issue"
  path={page.url.pathname}
  type="website"
  section="Error"
  tags="error"
/>

<div
  class="min-h-screen flex items-center justify-center px-8 py-20 text-center gap-4 flex-col bg-zinc-950"
>
  <h1 class="text-6xl font-bold text-orange-400">{page.status}</h1>

  <p class="text-2xl font-semibold text-zinc-100">
    {errorMessage}
  </p>

  <p class="text-xl text-zinc-500 text-balance max-w-lg mx-auto">
    {errorDescription}
  </p>

  <div class="flex gap-4 justify-center py-10 flex-col md:flex-row">
    <button
      onclick={() => history.back()}
      class="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm rounded-lg transition-all flex items-center gap-2"
    >
      <ArrowLeft class="w-4 h-4" />
      Go Back
    </button>

    <button
      onclick={() => location.reload()}
      class="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm rounded-lg transition-all flex items-center gap-2"
    >
      <RefreshCcw class="w-4 h-4" />
      Try Again
    </button>

    <a href="/" class="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-medium text-sm rounded-lg transition-all flex items-center gap-2">
      <Home class="w-4 h-4" />
      Go Home
    </a>
  </div>
</div>
