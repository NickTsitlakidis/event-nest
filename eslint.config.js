const { FlatCompat } = require("@eslint/eslintrc");
const nxEslintPlugin = require("@nx/eslint-plugin");
const sonarjsPlugin = require("eslint-plugin-sonarjs");
const eslintPluginPrettier = require("eslint-plugin-prettier");
const eslintPluginPerfectionist = require("eslint-plugin-perfectionist");
const js = require("@eslint/js");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended
});

module.exports = [
    {
        plugins: {
            "@nx": nxEslintPlugin,
            sonarjs: sonarjsPlugin,
            prettier: eslintPluginPrettier,
            perfectionist: eslintPluginPerfectionist
        }
    },
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
        rules: {
            "prettier/prettier": "error",
            "@nx/enforce-module-boundaries": [
                "error",
                {
                    enforceBuildableLibDependency: true,
                    allow: [],
                    depConstraints: [
                        {
                            sourceTag: "*",
                            onlyDependOnLibsWithTags: ["*"]
                        }
                    ]
                }
            ]
        }
    },
    ...compat
        .config({
            extends: ["plugin:@nx/typescript", "plugin:perfectionist/recommended-natural"]
        })
        .map((config) => ({
            ...config,
            files: ["**/*.ts"],
            rules: {
                ...sonarjsPlugin.configs.recommended.rules,
                ...config.rules,
                "sonarjs/no-duplicate-string": "warn",
                "perfectionist/sort-classes": [
                    "error",
                    {
                        type: "natural",
                        order: "asc",
                        groups: [
                            "index-signature",
                            "static-property",
                            "property",
                            "private-property",
                            "constructor",
                            "static-method",
                            ["get-method", "set-method"],
                            "method",
                            "private-method"
                        ]
                    }
                ],
                "@typescript-eslint/no-extra-semi": "error",
                "no-extra-semi": "off"
            }
        })),
    ...compat.config({ extends: ["plugin:@nx/javascript"] }).map((config) => ({
        ...config,
        files: ["**/*.js", "**/*.jsx"],
        rules: {
            ...config.rules,
            "@typescript-eslint/no-extra-semi": "error",
            "no-extra-semi": "off"
        }
    })),
    ...compat.config({ env: { jest: true } }).map((config) => ({
        ...config,
        files: ["**/*.spec.ts", "**/*.spec.tsx", "**/*.spec.js", "**/*.spec.jsx"],
        rules: {
            ...config.rules,
            "sonarjs/no-duplicate-string": "off",
            "@typescript-eslint/no-empty-function": "off",
            "@typescript-eslint/no-explicit-any": "off"
        }
    }))
];
