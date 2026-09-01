<script lang="ts">
    import FlowDiagram from "./flow-diagram.svelte";
</script>

<FlowDiagram
    caption="Snapshot policy evaluation is before persistence; snapshot creation and subscriptions are after it."
    steps={[
        "Snapshot policy decision",
        "Event persistence",
        "Resolve committed version",
        "Snapshot creation",
        "Subscription dispatch"
    ]}
/>
