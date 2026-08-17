<script lang="ts">
    import FlowDiagram from "./flow-diagram.svelte";
</script>

<FlowDiagram
    caption="A domain event moves from aggregate state change to durable history, then to in-process subscribers."
    steps={["Business method", "Apply state", "Append event", "Persist event", "Dispatch subscriptions"]}
/>
