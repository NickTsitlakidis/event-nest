<script lang="ts">
    let { label, tone = "neutral" }: { label: string; tone?: "deprecated" | "neutral" | "new" } = $props();
</script>

<span class={tone}>{label}</span>

<style>
    span {
        display: inline-block;
        border: 1px solid var(--en-border);
        border-radius: 999px;
        padding: 0.08rem 0.45rem;
        font-size: 0.72rem;
        font-weight: 700;
    }
    .new {
        border-color: var(--en-accent);
        color: var(--en-accent-strong);
    }
    .deprecated {
        border-color: var(--en-warning);
        color: var(--en-warning);
    }
</style>
