/* eslint-disable perfectionist/sort-objects -- Navigation order is part of the documentation structure. */
import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defaultTheme } from "@sveltepress/theme-default";
import { sveltepress } from "@sveltepress/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const repository = "https://github.com/NickTsitlakidis/event-nest";

// Deployment prefix ("/event-nest" on GitHub Pages); SvelteKit requires it to be empty or start with "/".
const basePath = (process.env.BASE_PATH ?? "") as "" | `/${string}`;

// The Get Started nav section spans two URL prefixes; both show the same flat page list.
const getStartedSidebar = [
    {
        title: "Get Started",
        items: [
            { title: "Meet Event Nest", to: "/overview/meet-event-nest/" },
            { title: "When to Use It", to: "/overview/when-to-use-it/" },
            { title: "Scope and Limitations", to: "/overview/scope-and-limitations/" },
            { title: "Installation", to: "/build-your-first-aggregate/installation/" },
            { title: "Your First Aggregate", to: "/build-your-first-aggregate/your-first-aggregate/" },
            { title: "Add a Projection", to: "/build-your-first-aggregate/add-a-projection/" }
        ]
    }
];

// The Reference nav section spans two URL prefixes; both show the same two sidebar groups.
const referenceSidebar = [
    {
        title: "API Reference",
        items: [
            { title: "Configuration", to: "/api-reference/configuration/" },
            { title: "Decorators", to: "/api-reference/decorators/" },
            { title: "Public API", to: "/api-reference/public-api/" },
            { title: "Exceptions", to: "/api-reference/exceptions/" }
        ]
    },
    {
        title: "Help",
        items: [
            { title: "Common Problems", to: "/help/common-problems/" },
            { title: "Compatibility", to: "/help/compatibility/" }
        ]
    }
];

const theme = defaultTheme({
    editLink: `${repository}/edit/main/apps/docs/src/routes:route`,
    github: repository,
    highlighter: {
        languages: ["bash", "css", "html", "json", "sql", "svelte", "ts"],
        themeDark: "tokyo-night",
        themeLight: "one-light"
    },
    i18n: {
        nextPage: "Next",
        onThisPage: "On this page",
        previousPage: "Previous",
        suggestChangesToThisPage: "Edit this page"
    },
    logo: "/event-nest.svg",
    navbar: [
        { title: "Get Started", to: "/overview/meet-event-nest/" },
        { title: "Core Model", to: "/core-model/domain-events/" },
        { title: "Storage", to: "/storage/storage-model/" },
        { title: "Capabilities", to: "/capabilities/aggregate-repository/" },
        { title: "How It Works", to: "/how-event-nest-works/commit-pipeline/" },
        { title: "Reference", to: "/api-reference/configuration/" }
    ],
    // Theme 8.6+ renders its own local search unless told otherwise; the site ships a custom one
    // (src/lib/components/search.svelte) that +layout.svelte slots into the header.
    search: false,
    sidebar: {
        "/overview/": getStartedSidebar,
        "/build-your-first-aggregate/": getStartedSidebar,
        "/core-model/": [
            {
                title: "Core Model",
                items: [
                    { title: "Domain Events", to: "/core-model/domain-events/" },
                    { title: "Aggregate Roots", to: "/core-model/aggregate-roots/" },
                    { title: "Applying and Replaying Events", to: "/core-model/applying-and-replaying-events/" },
                    { title: "Event Streams and Versions", to: "/core-model/event-streams-and-versions/" },
                    { title: "Domain Subscriptions", to: "/core-model/domain-subscriptions/" }
                ]
            }
        ],
        "/storage/": [
            {
                title: "Storage",
                items: [
                    { title: "Storage Model", to: "/storage/storage-model/" },
                    { title: "PostgreSQL", to: "/storage/postgresql/" },
                    { title: "PostgreSQL Schema", to: "/storage/postgresql-schema/" },
                    { title: "Microsoft SQL Server", to: "/storage/microsoft-sql-server/" },
                    { title: "SQL Server Schema", to: "/storage/sql-server-schema/" },
                    { title: "MongoDB", to: "/storage/mongodb/" }
                ]
            }
        ],
        "/capabilities/": [
            {
                title: "Capabilities",
                items: [
                    { title: "AggregateRepository", to: "/capabilities/aggregate-repository/" },
                    { title: "Snapshots", to: "/capabilities/snapshots/" },
                    { title: "Snapshot Policies", to: "/capabilities/snapshot-policies/" },
                    { title: "Event Aliases", to: "/capabilities/event-aliases/" },
                    { title: "Purging Aggregates", to: "/capabilities/purging-aggregates/" }
                ]
            }
        ],
        "/how-event-nest-works/": [
            {
                title: "How Event Nest Works",
                items: [
                    { title: "Commit Pipeline", to: "/how-event-nest-works/commit-pipeline/" },
                    { title: "Aggregate Reconstitution", to: "/how-event-nest-works/aggregate-reconstitution/" },
                    { title: "Snapshot Loading", to: "/how-event-nest-works/snapshot-loading/" },
                    { title: "Subscription Dispatch", to: "/how-event-nest-works/subscription-dispatch/" },
                    { title: "Failure Behaviour", to: "/how-event-nest-works/failure-behaviour/" }
                ]
            }
        ],
        "/api-reference/": referenceSidebar,
        "/help/": referenceSidebar
    },
    themeColor: {
        dark: "#1a1b26",
        gradient: { end: "#7847bd", start: "#2e7de9" },
        hover: "#2260bd",
        light: "#e9ebf2",
        primary: "#2e7de9"
    }
});

theme.pageLayout = fileURLToPath(new URL("src/lib/page-layout.svelte", import.meta.url));

const outputDirectory = fileURLToPath(new URL("../../dist/apps/docs", import.meta.url));

export default defineConfig({
    plugins: [
        sveltepress({
            siteConfig: {
                description: "Event sourcing primitives and persistence adapters for NestJS applications.",
                title: "Event Nest"
            },
            // SvelteKit 3 reads its configuration from the Vite plugin instead of svelte.config.js;
            // sveltepress owns the SvelteKit plugin, so the options are forwarded through it.
            svelteKitOptions: {
                adapter: adapter({
                    assets: outputDirectory,
                    fallback: "404.html",
                    pages: outputDirectory
                }),
                // Shiki puts tabindex="0" on <pre> so scrollable code blocks are keyboard-focusable,
                // which trips a11y_no_noninteractive_tabindex on every markdown page with a code fence.
                onwarn: (warning, defaultHandler) => {
                    if (warning.code === "a11y_no_noninteractive_tabindex" && warning.filename?.endsWith(".md")) {
                        return;
                    }
                    defaultHandler(warning);
                },
                paths: {
                    base: basePath,
                    relative: false
                },
                preprocess: [vitePreprocess()]
            },
            theme
        })
    ]
});
