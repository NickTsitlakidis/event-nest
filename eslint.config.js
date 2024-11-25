const nx = require("@nx/eslint-plugin");
const perfectionist = require("eslint-plugin-perfectionist");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = [
    ...nx.configs["flat/base"],
    ...nx.configs["flat/typescript"],
    ...nx.configs["flat/javascript"],
    perfectionist.configs["recommended-natural"],
    {
        ignores: ["**/dist"]
    },
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
        rules: {
            "@nx/enforce-module-boundaries": [
                "error",
                {
                    allow: ["^.*/eslint(\\.base)?\\.config\\.[cm]?js$"],
                    depConstraints: [
                        {
                            onlyDependOnLibsWithTags: ["*"],
                            sourceTag: "*"
                        }
                    ],
                    enforceBuildableLibDependency: true
                }
            ]
        }
    },
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
        // Override or add rules here
        rules: {
            "perfectionist/sort-classes": [
                "error",
                {
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
                    ],
                    order: "asc",
                    type: "natural"
                }
            ],
            "prettier/prettier": "error"
        }
    },
    {
        files: ["**/*.spec.ts", "**/*.spec.tsx", "**/*.spec.js", "**/*.spec.jsx"],
        rules: {
            "@typescript-eslint/no-empty-function": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "sonarjs/no-duplicate-string": "off"
        }
    },
    eslintPluginPrettierRecommended
];
