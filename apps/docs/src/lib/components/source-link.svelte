<script lang="ts">
    let { label = "View source", path }: { label?: string; path: string } = $props();
    const href = $derived(`https://github.com/NickTsitlakidis/event-nest/blob/main/${path}`);
</script>

<a {href} target="_blank" rel="noreferrer">{label}<span class="sr-only"> (opens in a new tab)</span></a>

<style>
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
    }
</style>
