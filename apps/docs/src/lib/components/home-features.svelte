<script lang="ts">
    import type { Pathname } from "$app/types";

    import { resolve } from "$app/paths";

    // SvelteKit's typed resolve() only accepts one concrete route per call and rejects a union of
    // routes, so widen the signature once; every member of the union is a real route.
    const resolveRoute = resolve as (route: Pathname) => string;

    const features = [
        {
            description: "Define named domain events, apply them to aggregate state, and replay persisted streams.",
            icon: "aggregate",
            title: "Aggregate-first model",
            to: "/core-model/aggregate-roots/"
        },
        {
            description:
                "Persist events with aggregate versions and reject conflicting writes through the storage adapter.",
            icon: "version",
            title: "Versioned commits",
            to: "/core-model/event-streams-and-versions/"
        },
        {
            description: "Reduce replay work with snapshot-aware aggregates and composable snapshot strategies.",
            icon: "snapshot",
            title: "Optional snapshots",
            to: "/capabilities/snapshots/"
        },
        {
            description: "MongoDB, PostgreSQL, and Microsoft SQL Server adapters expose the same EventStore contract.",
            icon: "storage",
            title: "Persistence adapters",
            to: "/storage/storage-model/"
        }
    ] as const;
</script>

<nav class="features" aria-label="Explore Event Nest">
    {#each features as feature (feature.to)}
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolveRoute is resolve() with a widened signature -->
        <a class="feature-item" href={resolveRoute(feature.to)}>
            <span class="icon" aria-hidden="true">
                {#if feature.icon === "aggregate"}
                    <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--en-accent)"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <circle cx="12" cy="5" r="2.2" />
                        <circle cx="6" cy="19" r="2.2" />
                        <circle cx="18" cy="19" r="2.2" />
                        <path d="M12 7.2v4.3M7.2 17.2 10.8 11M16.8 17.2 13.2 11" />
                    </svg>
                {:else if feature.icon === "version"}
                    <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--en-accent)"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 3v6M12 15v6" />
                    </svg>
                {:else if feature.icon === "snapshot"}
                    <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--en-accent)"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <rect x="4" y="7" width="16" height="13" rx="2" />
                        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <circle cx="12" cy="13.5" r="3.2" />
                    </svg>
                {:else}
                    <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--en-accent)"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <ellipse cx="12" cy="5.5" rx="7" ry="2.8" />
                        <path d="M5 5.5v13c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8v-13" />
                        <path d="M5 12c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8" />
                    </svg>
                {/if}
            </span>
            <span class="feature-title">{feature.title}</span>
            <span class="feature-description">{feature.description}</span>
        </a>
    {/each}
</nav>

<style>
    .features {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
        margin-block: 1.5rem 1rem;
    }

    .feature-item {
        display: block;
        padding: 1rem;
        border-radius: 0.5rem;
        background: #fff;
        color: var(--en-text) !important;
        text-decoration: none;
        transition: box-shadow 300ms;
    }

    .feature-item:hover {
        box-shadow:
            0 4px 6px -1px rgb(0 0 0 / 10%),
            0 2px 4px -2px rgb(0 0 0 / 10%);
    }

    .feature-item:hover .feature-title {
        text-decoration: underline;
    }

    .icon {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem;
        border-radius: 0.375rem;
        background: var(--en-accent-soft);
    }

    .feature-title,
    .feature-description {
        display: block;
    }

    .feature-title {
        margin-top: 0.75rem;
        font-weight: 600;
    }

    .feature-description {
        margin-top: 0.75rem;
        color: var(--en-text-muted);
        font-size: 0.875rem;
    }

    :global(html.dark) .feature-item {
        background: #18181b;
    }

    @media (min-width: 640px) {
        .features {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }
</style>
