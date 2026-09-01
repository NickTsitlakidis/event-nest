<script lang="ts">
    // Svelte keeps a single <title>: the last one rendered wins. Rendering this component after
    // the theme's PageLayout lets a page override the theme's title without duplicating the tag.
    const { title }: { title: string } = $props();
</script>

<svelte:head>
    <title>{title}</title>
</svelte:head>
