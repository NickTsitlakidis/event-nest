<script lang="ts">
    let { cause, name, resolution, trigger }: { cause: string; name: string; resolution: string; trigger: string } =
        $props();
</script>

<article class="exception">
    <h3><code>{name}</code></h3>
    <dl>
        <dt>Trigger</dt>
        <dd>{trigger}</dd>
        <dt>Typical cause</dt>
        <dd>{cause}</dd>
        <dt>Response</dt>
        <dd>{resolution}</dd>
    </dl>
</article>

<style>
    .exception {
        margin: 1rem 0;
        border: 1px solid var(--en-border);
        border-radius: 0.5rem;
        padding: 1rem;
    }
    h3 {
        margin-top: 0;
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
    @media (max-width: 520px) {
        dl {
            grid-template-columns: 1fr;
        }
    }
</style>
