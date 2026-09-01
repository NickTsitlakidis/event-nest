<script lang="ts">
    import { afterNavigate } from "$app/navigation";
    import { base } from "$app/paths";
    import { page } from "$app/state";
    import Search from "$lib/components/search.svelte";
    import { SITE_ORIGIN } from "$lib/site";
    import { onMount } from "svelte";

    import "../app.css";

    const { children } = $props();
    let searchHost: HTMLDivElement;

    const canonicalUrl = $derived(`${SITE_ORIGIN}${page.url.pathname}`);

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
            // Slot the search pill between the nav links and the icon controls.
            const iconArea = document.querySelector("header .navbar-pc");
            const firstIcon = iconArea?.querySelector(":scope > a, :scope > .toggle");
            if (firstIcon) {
                firstIcon.before(searchHost);
                searchHost.classList.add("ready");
            }
        });
    });
</script>

<svelte:head>
    <link rel="canonical" href={canonicalUrl} />
    <link rel="icon" href={`${base}/favicon.svg`} type="image/svg+xml" />
    <!-- og:title and twitter:title come per-page from page-layout.svelte. -->
    <meta property="og:site_name" content="Event Nest" />
    <meta
        property="og:description"
        content="Event sourcing primitives and persistence adapters for NestJS applications."
    />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalUrl} />
    <meta property="og:image" content={`${SITE_ORIGIN}${base}/social-card.svg`} />
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
