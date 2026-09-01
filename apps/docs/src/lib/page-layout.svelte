<script lang="ts">
    import type { Snippet } from "svelte";

    import { page } from "$app/state";
    import DefaultPageLayout from "@sveltepress/theme-default/PageLayout.svelte";

    import ReportIssue from "./components/report-issue.svelte";

    let { children, fm, heroImage }: { children?: Snippet; fm: Record<string, unknown>; heroImage?: Snippet } =
        $props();

    const showFeedback = $derived(page.route.id !== "/" && fm.layout !== false);
</script>

{#snippet articleContent()}
    {@render children?.()}
    {#if showFeedback}
        <ReportIssue />
    {/if}
{/snippet}

<DefaultPageLayout {fm} {heroImage} children={articleContent} />
