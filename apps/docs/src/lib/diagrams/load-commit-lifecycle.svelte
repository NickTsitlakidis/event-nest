<script lang="ts">
    import FlowDiagram from "./flow-diagram.svelte";
</script>

<FlowDiagram
    caption="This is the common workflow for loading an aggregate, making a change, and persisting it. The repository is a thin helper on top of that flow."
    steps={["Load stream", "Reconstitute", "Run behavior", "Append changes", "Commit"]}
/>
