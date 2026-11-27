<script lang="ts">
    import type { Snippet } from "svelte";

    import { page } from "$app/state";
    import DefaultPageLayout from "@sveltepress/theme-default/PageLayout.svelte";

    import ReportIssue from "./components/report-issue.svelte";
    import SeoTitle from "./components/seo-title.svelte";

    let {
        children,
        fm,
        heroImage,
        titleAction
    }: { children?: Snippet; fm: Record<string, unknown>; heroImage?: Snippet; titleAction?: Snippet } = $props();

    const isHome = $derived(page.route.id === "/");
    const showFeedback = $derived(!isHome && fm.layout !== false);
    const socialTitle = $derived(typeof fm.title === "string" ? fm.title : "Event Nest documentation");
    const seoTitle = $derived(typeof fm.seoTitle === "string" ? fm.seoTitle : undefined);
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

<DefaultPageLayout {fm} {heroImage} {titleAction} children={articleContent} />

{#if seoTitle}
    <SeoTitle title={seoTitle} />
{/if}
