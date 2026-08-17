<script lang="ts">
    /* eslint-disable unicorn/consistent-function-scoping, unicorn/no-top-level-assignment-in-function */
    import { base } from "$app/paths";
    import { onMount } from "svelte";

    interface SearchEntry {
        content: string;
        description: string;
        path: string;
        title: string;
    }

    let dialog: HTMLDialogElement;
    let input: HTMLInputElement;
    let entries: SearchEntry[] = [];
    let query = $state("");

    const results = $derived.by(() => {
        const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
        if (terms.length === 0) return [];

        return entries
            .map((entry) => {
                const haystack = `${entry.title} ${entry.description} ${entry.content}`.toLowerCase();
                return { entry, score: terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0) };
            })
            .filter(({ score }) => score === terms.length)
            .slice(0, 10);
    });

    function openSearch(): void {
        dialog.showModal();
        requestAnimationFrame(() => input.focus());
    }

    onMount(() => {
        async function loadIndex(): Promise<void> {
            const response = await fetch(`${base}/search-index.json`);
            entries = (await response.json()) as SearchEntry[];
        }

        const handleKeydown = (event: KeyboardEvent): void => {
            if (!((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) {
                return;
            }

            event.preventDefault();
            openSearch();
        };

        void loadIndex();
        globalThis.addEventListener("keydown", handleKeydown);
        return () => globalThis.removeEventListener("keydown", handleKeydown);
    });
</script>

<button class="search-button" type="button" onclick={openSearch} aria-label="Search documentation">
    <span aria-hidden="true">⌕</span>
    <span>Search</span>
    <kbd>Ctrl K</kbd>
</button>

<dialog bind:this={dialog} onclick={(event) => event.target === dialog && dialog.close()}>
    <div class="search-panel">
        <label for="docs-search">Search documentation</label>
        <input
            bind:this={input}
            bind:value={query}
            id="docs-search"
            type="search"
            placeholder="Search concepts, options, and errors"
        />
        <div class="results" aria-live="polite">
            {#if query && results.length === 0}
                <p>No matching pages.</p>
            {:else}
                {#each results as { entry } (entry.path)}
                    <a href={`${base}${entry.path}`} onclick={() => dialog.close()}>
                        <strong>{entry.title}</strong>
                        <span>{entry.description}</span>
                    </a>
                {/each}
            {/if}
        </div>
        <button class="close" type="button" onclick={() => dialog.close()}>Close</button>
    </div>
</dialog>

<style>
    .search-button {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        border: 1px solid transparent;
        border-radius: 9999px;
        background: color-mix(in srgb, var(--en-surface-muted) 55%, transparent);
        padding: 0.4rem 0.75rem;
        color: var(--en-text-muted);
        cursor: pointer;
        transition:
            background 0.2s,
            border-color 0.2s;
    }
    .search-button:hover {
        border-color: var(--en-border);
        background: var(--en-surface-muted);
    }
    kbd {
        border-radius: 0.3rem;
        background: color-mix(in srgb, var(--en-text-muted) 14%, transparent);
        padding: 0.1rem 0.35rem;
        font-size: 0.68rem;
        font-family: inherit;
    }
    dialog {
        width: min(42rem, calc(100vw - 2rem));
        border: 1px solid var(--en-border);
        border-radius: 0.75rem;
        background: var(--en-surface);
        color: var(--en-text);
        padding: 0;
    }
    dialog::backdrop {
        background: rgb(13 14 22 / 60%);
    }
    .search-panel {
        display: grid;
        gap: 0.75rem;
        padding: 1rem;
    }
    label {
        font-weight: 700;
    }
    input {
        border: 1px solid var(--en-border);
        border-radius: 0.5rem;
        background: var(--en-bg);
        padding: 0.75rem;
        color: var(--en-text);
        font: inherit;
    }
    .results {
        display: grid;
        max-height: 55vh;
        overflow-y: auto;
    }
    .results a {
        display: grid;
        gap: 0.15rem;
        border-bottom: 1px solid var(--en-border);
        padding: 0.7rem 0.3rem;
        color: var(--en-text);
        text-decoration: none;
    }
    .results a:hover {
        background: var(--en-surface-muted);
    }
    .results span {
        color: var(--en-text-muted);
        font-size: 0.85rem;
    }
    .close {
        justify-self: end;
        border: 0;
        background: transparent;
        color: var(--en-accent-strong);
        cursor: pointer;
    }
    @media (max-width: 850px) {
        .search-button span:not(:first-child),
        kbd {
            display: none;
        }
    }
</style>
