import { defaultTheme } from "@sveltepress/theme-default";
import { sveltepress } from "@sveltepress/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const repository = "https://github.com/NickTsitlakidis/event-nest";

// Navigation and sidebars arrive with the documentation content; the scaffold ships an empty shell.
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
    navbar: [],
    sidebar: {},
    themeColor: {
        dark: "#1a1b26",
        gradient: { end: "#7847bd", start: "#2e7de9" },
        hover: "#2260bd",
        light: "#e9ebf2",
        primary: "#2e7de9"
    }
});

theme.pageLayout = fileURLToPath(new URL("src/lib/page-layout.svelte", import.meta.url));

export default defineConfig({
    plugins: [
        sveltepress({
            siteConfig: {
                description: "Event sourcing primitives and persistence adapters for NestJS applications.",
                title: "Event Nest"
            },
            theme
        })
    ]
});
