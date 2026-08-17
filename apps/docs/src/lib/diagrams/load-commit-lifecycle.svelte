<script lang="ts">
    import FlowDiagram from "./flow-diagram.svelte";
</script>

<FlowDiagram
    caption="The common repository workflow loads history, runs behavior, and commits new events."
    steps={["Load stream", "Reconstitute", "Run behavior", "Append changes", "Commit"]}
/>
