import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";

const outputDirectory = fileURLToPath(new URL("../../dist/apps/docs", import.meta.url));

/** @type {import("@sveltejs/kit").Config} */
const config = {
    kit: {
        adapter: adapter({
            assets: outputDirectory,
            fallback: "404.html",
            pages: outputDirectory
        }),
        paths: {
            base: process.env.BASE_PATH ?? ""
        }
    },
    preprocess: vitePreprocess()
};

export default config;
