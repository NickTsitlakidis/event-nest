<script lang="ts">
    import { base } from "$app/paths";
    import { page } from "$app/state";

    import "../app.css";

    const { children } = $props();

    const canonicalUrl = $derived(`https://nicktsitlakidis.github.io${page.url.pathname}`);
</script>

<svelte:head>
    <link rel="canonical" href={canonicalUrl} />
    <link rel="icon" href={`${base}/favicon.svg`} type="image/svg+xml" />
    <meta property="og:site_name" content="Event Nest" />
    <meta property="og:title" content="Event Nest documentation" />
    <meta
        property="og:description"
        content="Event sourcing primitives and persistence adapters for NestJS applications."
    />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalUrl} />
    <meta property="og:image" content={`https://nicktsitlakidis.github.io${base}/social-card.svg`} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Event Nest documentation" />
    <meta
        name="twitter:description"
        content="Event sourcing primitives and persistence adapters for NestJS applications."
    />
    <meta name="theme-color" content="#2e7de9" />
</svelte:head>

{@render children?.()}
