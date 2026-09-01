import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";

const outputDirectory = fileURLToPath(new URL("../../dist/apps/docs", import.meta.url));

/** @type {import("@sveltejs/kit").Config} */
const config = {
    extensions: [".svelte", ".md"],
    kit: {
        adapter: adapter({
            assets: outputDirectory,
            fallback: "404.html",
            pages: outputDirectory
        }),
        paths: {
            base: process.env.BASE_PATH ?? "",
            relative: false
        }
    },
    // Shiki puts tabindex="0" on <pre> so scrollable code blocks are keyboard-focusable, which
    // trips a11y_no_noninteractive_tabindex on every markdown page with a code fence.
    onwarn: (warning, defaultHandler) => {
        if (warning.code === "a11y_no_noninteractive_tabindex" && warning.filename?.endsWith(".md")) {
            return;
        }
        defaultHandler(warning);
    },
    preprocess: [vitePreprocess()]
};

export default config;
