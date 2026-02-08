const nx = require("@nx/eslint-plugin");
const perfectionist = require("eslint-plugin-perfectionist");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");
const eslintPluginUnicornModule = require("eslint-plugin-unicorn");
const eslintPluginUnicorn = eslintPluginUnicornModule.default ?? eslintPluginUnicornModule;

module.exports = [
    ...nx.configs["flat/base"],
    ...nx.configs["flat/typescript"],
    ...nx.configs["flat/javascript"],
    perfectionist.configs["recommended-natural"],
    eslintPluginUnicorn.configs["flat/recommended"],
    {
        ignores: ["**/dist"]
    },
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
        rules: {
            "@nx/enforce-module-boundaries": [
                "error",
                {
                    allow: [String.raw`^.*/eslint(\.base)?\.config\.[cm]?js$`],
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
            "prettier/prettier": "error",
            "unicorn/no-abusive-eslint-disable": "off",
            "unicorn/no-array-for-each": "off",
            "unicorn/no-for-loop": "warn",
            "unicorn/no-static-only-class": "off",
            "unicorn/prefer-top-level-await": "warn",
            "unicorn/prevent-abbreviations": "warn"
        }
    },
    {
        files: ["**/*.spec.ts", "**/*.spec.tsx", "**/*.spec.js", "**/*.spec.jsx"],
        rules: {
            "@typescript-eslint/no-empty-function": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "sonarjs/no-duplicate-string": "off",
            "unicorn/prevent-abbreviations": "off"
        }
    },
    {
        files: ["**/*.config.js"],
        rules: {
            "unicorn/prefer-module": "off"
        }
    },
    eslintPluginPrettierRecommended
];
