<script lang="ts">
    import type { Snippet } from "svelte";

    import { page } from "$app/state";
    import DefaultPageLayout from "@sveltepress/theme-default/PageLayout.svelte";

    import ReportIssue from "./components/report-issue.svelte";
    import SeoTitle from "./components/seo-title.svelte";

    let { children, fm, heroImage }: { children?: Snippet; fm: Record<string, unknown>; heroImage?: Snippet } =
        $props();

    const isHome = $derived(page.route.id === "/");
    const showFeedback = $derived(!isHome && fm.layout !== false);
    const socialTitle = $derived(typeof fm.title === "string" ? fm.title : "Event Nest documentation");

    // Theme 8.x renders fm.title both in the head <title> and as the hero heading. The hero should
    // keep the site title ("Event Nest"), so strip fm.title on the home route and re-emit the SEO
    // title through SeoTitle below.
    const layoutFm = $derived(isHome ? { ...fm, title: undefined } : fm);
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

<DefaultPageLayout fm={layoutFm} {heroImage} children={articleContent} />

{#if isHome && typeof fm.title === "string"}
    <SeoTitle title={`${fm.title} - Event Nest`} />
{/if}
