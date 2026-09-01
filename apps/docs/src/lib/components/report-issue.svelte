<script lang="ts">
    import { page } from "$app/state";

    const repoUrl = "https://github.com/NickTsitlakidis/event-nest";
    const issueUrl = $derived(
        `${repoUrl}/issues/new?labels=documentation&title=${encodeURIComponent(`Docs: ${page.url.pathname}`)}`
    );
</script>

<div class="feedback" aria-label="Documentation feedback">
    <span>Found a documentation problem?</span>
    <a href={issueUrl} target="_blank" rel="noreferrer">Report an issue</a>
</div>

<style>
    .feedback {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 3rem;
        border-top: 1px solid var(--en-border);
        padding-top: 1rem;
        color: var(--en-text-muted);
        font-size: 0.9rem;
    }
</style>
