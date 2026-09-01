<script lang="ts">
    /* eslint-disable unicorn/no-top-level-assignment-in-function */
    let { packages }: { packages: string[] } = $props();

    const names = $derived(packages.join(" "));
    const tabs = $derived([
        { command: `pnpm add ${names}`, name: "pnpm" },
        { command: `npm install ${names}`, name: "npm" },
        { command: `yarn add ${names}`, name: "Yarn" }
    ]);
    let active = $state(0);

    // Own tab markup instead of the theme's Tabs/CodeBlock: the theme renders role="tab" without a
    // tablist parent (axe: aria-required-parent) and highlights runtime code with the dark Shiki
    // theme in both color modes. One-line install commands need neither.
    function onKeydown(event: KeyboardEvent) {
        const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (delta === 0) {
            return;
        }

        event.preventDefault();
        active = (active + delta + tabs.length) % tabs.length;
        const buttons = (event.currentTarget as HTMLElement).parentElement?.children;
        (buttons?.[active] as HTMLElement | undefined)?.focus();
    }
</script>

<div class="package-install">
    <div role="tablist" aria-label="Package manager">
        {#each tabs as tab, index (tab.name)}
            <button
                type="button"
                role="tab"
                aria-selected={active === index}
                tabindex={active === index ? 0 : -1}
                class:active={active === index}
                onclick={() => (active = index)}
                onkeydown={onKeydown}
            >
                {tab.name}
            </button>
        {/each}
    </div>
    {#each tabs as tab, index (tab.name)}
        <div role="tabpanel" hidden={active !== index}>
            <pre class="install-command">{tab.command}</pre>
        </div>
    {/each}
</div>

<style>
    .package-install {
        border: 1px solid var(--en-border);
        border-radius: 8px;
        background: var(--en-surface);
        overflow: hidden;
    }

    [role="tablist"] {
        display: flex;
        border-bottom: 1px solid var(--en-border);
    }

    [role="tab"] {
        margin: 0;
        padding: 0.85rem 1.5rem;
        border: none;
        background: transparent;
        color: var(--en-text-muted);
        font: inherit;
        font-weight: 500;
        cursor: pointer;
        box-shadow: inset 0 -2px transparent;
        transition:
            color 0.15s,
            box-shadow 0.15s;
    }

    [role="tab"]:hover {
        color: var(--en-text);
    }

    [role="tab"].active {
        color: var(--en-accent-strong);
        box-shadow: inset 0 -2px var(--en-accent);
    }

    .install-command {
        margin: 0;
        padding: 0.9rem 1.25rem;
        color: var(--en-text);
        font-family: var(--svp-code-font);
        font-size: 0.9rem;
        line-height: 1.6;
        overflow-x: auto;
    }
</style>
