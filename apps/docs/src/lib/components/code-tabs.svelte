<script lang="ts">
    import type { Snippet } from "svelte";

    import { Tabs } from "@sveltepress/theme-default/components";

    let { activeName, children }: { activeName: string; children?: Snippet } = $props();
</script>

<Tabs {activeName}>{@render children?.()}</Tabs>
