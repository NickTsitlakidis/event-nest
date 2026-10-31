import svelte from "eslint-plugin-svelte";
import { defineConfig } from "eslint/config";
import ts from "typescript-eslint";

import baseConfig from "../../eslint.config.js";

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
                // SvelteKit 3 has no svelte.config.js; tell the parser this is still a Kit project.
                svelteConfig: { kit: {} }
            }
        }
    },
    {
        files: ["src/routes/**/+*.{js,ts}"],
        rules: {
            "unicorn/consistent-boolean-name": "off"
        }
    },
    {
        // SvelteKit 3 replaced the $lib alias with the #lib subpath import; Nx resolves it to a file in
        // this project and would otherwise demand a relative path.
        files: ["src/**/*.{js,ts}"],
        rules: {
            "@nx/enforce-module-boundaries": [
                "error",
                {
                    allow: ["#lib/*"],
                    depConstraints: [{ onlyDependOnLibsWithTags: ["*"], sourceTag: "*" }],
                    enforceBuildableLibDependency: true
                }
            ]
        }
    },
    {
        files: ["src/lib/components/{report-issue,search,source-link}.svelte"],
        rules: {
            "svelte/no-navigation-without-resolve": "off"
        }
    }
);
