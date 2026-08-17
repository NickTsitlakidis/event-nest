<script lang="ts">
    import FlowDiagram from "./flow-diagram.svelte";
</script>

<FlowDiagram
    caption="Reconstitution applies the latest compatible snapshot, then only events with later aggregate versions."
    steps={["Compatible snapshot at v20", "Apply snapshot", "Replay events v21-v24", "Aggregate at v24"]}
/>
