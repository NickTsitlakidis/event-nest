<script lang="ts">
    let { caption, steps }: { caption: string; steps: string[] } = $props();
</script>

<figure aria-label={caption}>
    <div class="flow">
        {#each steps as step, index (step)}
            <div class="step">{step}</div>
            {#if index < steps.length - 1}<span aria-hidden="true">→</span>{/if}
        {/each}
    </div>
    <figcaption>{caption}</figcaption>
</figure>

<style>
    figure {
        margin: 1.75rem 0;
    }
    .flow {
        display: flex;
        align-items: stretch;
        flex-wrap: wrap;
        gap: 0.55rem;
        padding: 0.25rem;
    }
    .step {
        display: grid;
        min-width: 8.5rem;
        place-items: center;
        border: 1px solid var(--en-border);
        border-top: 0.25rem solid var(--en-accent);
        border-radius: 0.45rem;
        background: var(--en-surface);
        padding: 0.8rem;
        text-align: center;
        font-weight: 650;
    }
    .flow span {
        align-self: center;
        color: var(--en-text-muted);
        font-size: 1.4rem;
    }
    figcaption {
        margin-top: 0.55rem;
        color: var(--en-text-muted);
        font-size: 0.85rem;
    }
    @media (max-width: 640px) {
        .flow {
            flex-direction: column;
        }
        .flow span {
            rotate: 90deg;
        }
    }
</style>
