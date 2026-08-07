/* eslint-disable unicorn/prefer-module */
const path = require("node:path");

const nxPreset = require("@nx/jest/preset").default;

process.env.MONGO_MEMORY_SERVER_FILE = path.resolve(__dirname, "jest-mongodb-config.js");

const mongoPreset = require("@shelf/jest-mongodb/jest-preset");
const merged = Object.assign(nxPreset, mongoPreset);

module.exports = {
    ...merged,
    passWithNoTests: true,
    // Inferred Nx jest targets run with the project directory as cwd, so the lcov
    // reporter would write source paths relative to the lib. Coveralls resolves them
    // from the workspace root, so anchor them there explicitly.
    coverageReporters: [["lcov", { projectRoot: __dirname }], "html"],
    // Resolve @event-nest/* workspace packages to their TypeScript source via the
    // "event-nest-source" export condition instead of the compiled dist output.
    // The condition is namespaced on purpose: "development" would also be activated
    // by consumers' bundlers in dev mode, where the source file does not exist.
    testEnvironmentOptions: {
        customExportConditions: ["event-nest-source", "node", "node-addons"]
    }
};
