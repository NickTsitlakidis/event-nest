const baseConfig = require("../../eslint.config.js");

module.exports = [
    ...baseConfig,
    {
        files: ["tsconfig.lib.json"],
        rules: {
            "unicorn/prevent-abbreviations": "off"
        }
    },
    {
        files: ["**/*.json"],
        languageOptions: {
            parser: require("jsonc-eslint-parser")
        },
        rules: {
            "@nx/dependency-checks": [
                "error",
                {
                    ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"]
                }
            ]
        }
    }
];
