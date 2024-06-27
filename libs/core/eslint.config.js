const { FlatCompat } = require("@eslint/eslintrc");
const baseConfig = require("../../eslint.config.js");
const js = require("@eslint/js");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended
});

module.exports = [
    ...baseConfig,
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
        rules: {}
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        rules: {}
    },
    {
        files: ["**/*.js", "**/*.jsx"],
        rules: {}
    },
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
