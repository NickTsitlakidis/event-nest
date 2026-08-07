/* eslint-disable */
export default {
    displayName: "postgresql",
    preset: "../../jest.preset.js",
    testEnvironment: "node",
    transform: {
        "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }]
    },
    moduleFileExtensions: ["ts", "js", "html"],
    coverageDirectory: "../../coverage/libs/postgresql",
    collectCoverage: true,
    collectCoverageFrom: ["src/**/*.ts", "!src/**/index.ts"],
    resetMocks: true
};
