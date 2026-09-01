<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        children,
        title,
        variant = "note"
    }: {
        children?: Snippet;
        title?: string;
        variant?: "danger" | "important" | "note" | "version" | "warning";
    } = $props();
</script>

<aside class={`callout ${variant}`} aria-label={title ?? variant}>
    <strong>{title ?? variant[0].toUpperCase() + variant.slice(1)}</strong>
    <div>{@render children?.()}</div>
</aside>

<style>
    .callout {
        margin: 1.5rem 0;
        border: 1px solid var(--en-border);
        border-left: 0.3rem solid var(--en-accent);
        border-radius: 0.4rem;
        background: var(--en-surface-muted);
        padding: 0.9rem 1rem;
    }
    .callout.warning {
        border-left-color: var(--en-warning);
    }
    .callout.danger {
        border-left-color: var(--en-danger);
    }
    .callout.version {
        border-left-color: var(--en-text-muted);
    }
    .callout :global(p:last-child) {
        margin-bottom: 0;
    }
</style>
