<script lang="ts">
    import SourceLink from "./source-link.svelte";
    import VersionBadge from "./version-badge.svelte";

    let {
        kind,
        name,
        packageName,
        source,
        status
    }: { kind: string; name: string; packageName: string; source: string; status?: string } = $props();
</script>

<article class="symbol">
    <div>
        <code>{name}</code>
        {#if status}<VersionBadge label={status} tone={status === "deprecated" ? "deprecated" : "neutral"} />{/if}
    </div>
    <small>{kind} from <code>{packageName}</code></small>
    <SourceLink path={source} />
</article>

<style>
    .symbol {
        display: grid;
        gap: 0.35rem;
        border: 1px solid var(--en-border);
        border-radius: 0.5rem;
        background: var(--en-surface);
        padding: 0.9rem;
    }
    .symbol > div {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    small {
        color: var(--en-text-muted);
    }
</style>
