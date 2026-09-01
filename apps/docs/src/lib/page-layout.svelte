<script lang="ts">
    import type { Snippet } from "svelte";

    import { page } from "$app/state";
    import DefaultPageLayout from "@sveltepress/theme-default/PageLayout.svelte";

    import ReportIssue from "./components/report-issue.svelte";

    let { children, fm, heroImage }: { children?: Snippet; fm: Record<string, unknown>; heroImage?: Snippet } =
        $props();

    const showFeedback = $derived(page.route.id !== "/" && fm.layout !== false);
    const socialTitle = $derived(typeof fm.title === "string" ? fm.title : "Event Nest documentation");
</script>

<svelte:head>
    <meta property="og:title" content={socialTitle} />
    <meta name="twitter:title" content={socialTitle} />
</svelte:head>

{#snippet articleContent()}
    {@render children?.()}
    {#if showFeedback}
        <ReportIssue />
    {/if}
{/snippet}

<DefaultPageLayout {fm} {heroImage} children={articleContent} />
