<script lang="ts">
    export type ExceptionEntry = {
        cause: string;
        code: string;
        fields?: string;
        name: string;
        resolution: string;
        trigger: string;
    };

    let { items }: { items: ExceptionEntry[] } = $props();
</script>

{#each items as item (item.name)}
    <article class="exception">
        <h3>
            <code>{item.name}</code>
            <span class="code">{item.code}</span>
        </h3>
        <dl>
            <dt>Trigger</dt>
            <dd>{item.trigger}</dd>
            <dt>Typical cause</dt>
            <dd>{item.cause}</dd>
            <dt>Response</dt>
            <dd>{item.resolution}</dd>
            {#if item.fields}
                <dt>Fields</dt>
                <dd><code>{item.fields}</code></dd>
            {/if}
        </dl>
    </article>
{/each}

<style>
    .exception {
        margin: 1rem 0;
        border: 1px solid var(--en-border);
        border-radius: 0.5rem;
        padding: 1rem;
    }
    h3 {
        margin-top: 0;
        display: flex;
        align-items: baseline;
        gap: 0.6rem;
        flex-wrap: wrap;
    }
    .code {
        font-size: 0.8rem;
        font-weight: 400;
        opacity: 0.75;
    }
    dl {
        display: grid;
        grid-template-columns: 8rem 1fr;
        gap: 0.45rem 1rem;
    }
    dt {
        font-weight: 700;
    }
    dd {
        margin: 0;
    }
    dd > code {
        display: inline-block;
    }
    @media (max-width: 520px) {
        dl {
            grid-template-columns: 1fr;
        }
    }
</style>
