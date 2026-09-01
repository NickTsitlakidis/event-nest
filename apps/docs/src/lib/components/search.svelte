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

    interface SearchResult {
        entry: SearchEntry;
        excerpt: string;
        score: number;
    }

    type IndexState = "error" | "loading" | "ready";

    let dialog: HTMLDialogElement;
    let input: HTMLInputElement;
    let resultsContainer: HTMLDivElement;
    let entries: SearchEntry[] = [];
    let indexState = $state<IndexState>("loading");
    let query = $state("");

    const results = $derived.by(() => {
        const normalizedQuery = query.toLowerCase().trim();
        const terms = normalizedQuery.split(/\s+/).filter(Boolean);
        if (terms.length === 0) return [];

        return entries
            .map((entry) => {
                const score = scoreEntry(entry, normalizedQuery, terms);
                return { entry, excerpt: excerptFor(entry, terms), score } satisfies SearchResult;
            })
            .filter(({ score }) => score >= 0)
            .toSorted((left, right) => right.score - left.score || left.entry.title.localeCompare(right.entry.title))
            .slice(0, 10);
    });

    function countOccurrences(text: string, term: string): number {
        let count = 0;
        let index = 0;

        while ((index = text.indexOf(term, index)) !== -1) {
            count += 1;
            index += term.length;
        }

        return count;
    }

    function scoreEntry(entry: SearchEntry, normalizedQuery: string, terms: string[]): number {
        const title = entry.title.toLowerCase();
        const description = entry.description.toLowerCase();
        const content = entry.content.toLowerCase();
        let score = title === normalizedQuery ? 1000 : title.startsWith(normalizedQuery) ? 200 : 0;

        for (const term of terms) {
            const titleMatches = countOccurrences(title, term);
            const descriptionMatches = countOccurrences(description, term);
            const contentMatches = countOccurrences(content, term);
            if (titleMatches + descriptionMatches + contentMatches === 0) {
                return -1;
            }

            score += Math.min(titleMatches, 3) * 100;
            score += Math.min(descriptionMatches, 3) * 20;
            score += Math.min(contentMatches, 8) * 2;
        }

        return score;
    }

    function excerptFor(entry: SearchEntry, terms: string[]): string {
        for (const source of [entry.description, entry.content]) {
            const normalizedSource = source.toLowerCase();
            const matchIndex = Math.min(
                ...terms.map((term) => normalizedSource.indexOf(term)).filter((index) => index >= 0)
            );
            if (Number.isFinite(matchIndex)) {
                const start = Math.max(0, matchIndex - 70);
                const end = Math.min(source.length, matchIndex + 150);
                return `${start > 0 ? "…" : ""}${source.slice(start, end).trim()}${end < source.length ? "…" : ""}`;
            }
        }

        return entry.description;
    }

    function resultLinks(): HTMLAnchorElement[] {
        return resultsContainer ? [...resultsContainer.querySelectorAll<HTMLAnchorElement>("a")] : [];
    }

    function focusResult(index: number): void {
        resultLinks().at(index)?.focus();
    }

    function handleInputKeydown(event: KeyboardEvent): void {
        switch (event.key) {
            case "ArrowDown": {
                event.preventDefault();
                focusResult(0);
                break;
            }
            case "ArrowUp": {
                event.preventDefault();
                focusResult(-1);
                break;
            }
            case "Enter": {
                const firstResult = resultLinks()[0];
                if (firstResult) {
                    event.preventDefault();
                    firstResult.click();
                }
                break;
            }
        }
    }

    function handleResultKeydown(event: KeyboardEvent, index: number): void {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            const links = resultLinks();
            links[(index + 1) % links.length]?.focus();
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (index === 0) {
                input.focus();
            } else {
                focusResult(index - 1);
            }
        }
    }

    function openSearch(): void {
        if (!dialog.open) {
            dialog.showModal();
        }
        requestAnimationFrame(() => input.focus());
    }

    async function loadIndex(): Promise<void> {
        indexState = "loading";
        try {
            const response = await fetch(`${base}/search-index.json`);
            if (!response.ok) {
                throw new Error(`Search index request failed with status ${response.status}`);
            }
            entries = (await response.json()) as SearchEntry[];
            indexState = "ready";
        } catch {
            entries = [];
            indexState = "error";
        }
    }

    onMount(() => {
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
    <!-- Hidden from the accessible name: axe requires the visible label to appear in aria-label. -->
    <kbd aria-hidden="true">Ctrl K</kbd>
</button>

<dialog
    bind:this={dialog}
    aria-labelledby="docs-search-label"
    onclick={(event) => event.target === dialog && dialog.close()}
>
    <div class="search-panel">
        <label id="docs-search-label" for="docs-search">Search documentation</label>
        <input
            bind:this={input}
            bind:value={query}
            id="docs-search"
            type="search"
            placeholder="Search concepts, options, and errors"
            onkeydown={handleInputKeydown}
        />
        <div bind:this={resultsContainer} class="results" aria-busy={indexState === "loading"} aria-live="polite">
            {#if indexState === "loading"}
                <p role="status">Loading search index…</p>
            {:else if indexState === "error"}
                <div class="search-error" role="alert">
                    <p>Search is temporarily unavailable.</p>
                    <button type="button" onclick={() => void loadIndex()}>Retry</button>
                </div>
            {:else if query && results.length === 0}
                <p>No matching pages.</p>
            {:else}
                {#each results as { entry, excerpt }, index (entry.path)}
                    <a
                        href={`${base}${entry.path}`}
                        onclick={() => dialog.close()}
                        onkeydown={(event) => handleResultKeydown(event, index)}
                    >
                        <strong>{entry.title}</strong>
                        <span>{excerpt}</span>
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
    .results a:hover,
    .results a:focus-visible {
        background: var(--en-surface-muted);
    }
    .results span {
        color: var(--en-text-muted);
        font-size: 0.85rem;
    }
    .search-error {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }
    .search-error button {
        border: 1px solid var(--en-border);
        border-radius: 0.4rem;
        background: var(--en-bg);
        padding: 0.4rem 0.65rem;
        color: var(--en-accent-strong);
        cursor: pointer;
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
