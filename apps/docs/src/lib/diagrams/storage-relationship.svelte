<script lang="ts">
    import FlowDiagram from "./flow-diagram.svelte";
</script>

<FlowDiagram
    caption="An aggregate version record anchors its immutable event stream and optional snapshots."
    steps={["Aggregate id + version", "Ordered stored events", "Optional snapshots"]}
/>
