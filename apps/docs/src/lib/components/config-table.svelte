<script lang="ts">
    export interface ConfigRow {
        defaultValue?: string;
        description: string;
        name: string;
        required: string;
        type: string;
    }

    let { rows }: { rows: ConfigRow[] } = $props();
</script>

<div class="table-wrap">
    <table>
        <thead><tr><th>Option</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
            {#each rows as row (row.name)}
                <tr>
                    <td><code>{row.name}</code></td><td><code>{row.type}</code></td><td>{row.required}</td>
                    <td>{row.defaultValue ?? "-"}</td><td>{row.description}</td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    .table-wrap {
        max-width: 100%;
        overflow-x: auto;
    }
    table {
        width: 100%;
        min-width: 48rem;
        border-collapse: collapse;
    }
    th,
    td {
        border-bottom: 1px solid var(--en-border);
        padding: 0.65rem;
        text-align: left;
        vertical-align: top;
    }
</style>
