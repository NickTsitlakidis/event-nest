<script lang="ts">
    import { CodeBlock, TabPanel, Tabs } from "@sveltepress/theme-default/components";

    let { packages }: { packages: string[] } = $props();
    const names = $derived(packages.join(" "));
</script>

<Tabs activeName="pnpm">
    <TabPanel name="pnpm"><CodeBlock lang="bash" code={`pnpm add ${names}`} /></TabPanel>
    <TabPanel name="npm"><CodeBlock lang="bash" code={`npm install ${names}`} /></TabPanel>
    <TabPanel name="Yarn"><CodeBlock lang="bash" code={`yarn add ${names}`} /></TabPanel>
</Tabs>
