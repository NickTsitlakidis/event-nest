<script lang="ts">
    import { afterNavigate } from "$app/navigation";
    import { base } from "$app/paths";
    import { page } from "$app/state";
    import Search from "$lib/components/search.svelte";
    import { onMount } from "svelte";

    import "../app.css";

    const { children } = $props();
    let searchHost: HTMLDivElement;

    const canonicalUrl = $derived(`https://nicktsitlakidis.github.io${page.url.pathname}`);

    // The theme renders these icon-only controls without accessible names (axe: aria-command-name).
    // It also re-renders them after hydration, so a one-shot pass gets wiped; observe instead.
    const themeControlLabels: Array<[string, string]> = [
        [".sidebar-logo .close", "Close navigation"],
        ["nav.sub-nav [role='button']", "Open navigation"],
        ["header .nav-trigger", "Open navigation menu"]
    ];

    function labelThemeControls() {
        for (const [selector, label] of themeControlLabels) {
            for (const control of document.querySelectorAll(selector)) {
                // Icon-only controls only: labeling one with visible text creates a name mismatch.
                if (!control.getAttribute("aria-label") && !control.textContent?.trim()) {
                    control.setAttribute("aria-label", label);
                }
            }
        }
    }

    onMount(() => {
        labelThemeControls();
        const observer = new MutationObserver(labelThemeControls);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    });

    afterNavigate(() => {
        requestAnimationFrame(() => {
            const header = document.querySelector("header .header-inner");
            const navigation = header?.querySelector(".nav-links");
            if (header && navigation) {
                navigation.before(searchHost);
                searchHost.classList.add("ready");
            }
        });
    });
</script>

<svelte:head>
    <link rel="canonical" href={canonicalUrl} />
    <link rel="icon" href={`${base}/favicon.svg`} type="image/svg+xml" />
    <meta property="og:site_name" content="Event Nest" />
    <meta
        property="og:description"
        content="Event sourcing primitives and persistence adapters for NestJS applications."
    />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalUrl} />
    <meta property="og:image" content={`https://nicktsitlakidis.github.io${base}/social-card.svg`} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta
        name="twitter:description"
        content="Event sourcing primitives and persistence adapters for NestJS applications."
    />
    <meta name="theme-color" content="#2e7de9" />
</svelte:head>

{@render children?.()}

<div bind:this={searchHost} class="doc-search search-host">
    <Search />
</div>

<style>
    .search-host:not(.ready) {
        display: none;
    }
</style>
