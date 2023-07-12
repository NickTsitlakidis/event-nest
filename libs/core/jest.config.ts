/* eslint-disable */
export default {
    displayName: "core",
    preset: "../../jest.preset.js",
    testEnvironment: "node",
    transform: {
        "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }]
    },
    moduleFileExtensions: ["ts", "js", "html"],
    setupFilesAfterEnv: ["<rootDir>/setup-tests.ts"],
    coverageDirectory: "../../coverage/libs/core",
    resetMocks: true
};
