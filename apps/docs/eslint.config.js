import svelte from "eslint-plugin-svelte";
import { defineConfig } from "eslint/config";
import ts from "typescript-eslint";

import baseConfig from "../../eslint.config.js";
import svelteConfig from "./svelte.config.js";

export default defineConfig(
    baseConfig,
    svelte.configs.recommended,
    svelte.configs.prettier,
    {
        files: ["**/*.svelte", "**/*.svelte.js", "**/*.svelte.ts"],
        languageOptions: {
            parserOptions: {
                extraFileExtensions: [".svelte"],
                parser: ts.parser,
                svelteConfig
            }
        }
    },
    {
        files: ["src/routes/**/+*.{js,ts}"],
        rules: {
            "unicorn/consistent-boolean-name": "off"
        }
    }
);
