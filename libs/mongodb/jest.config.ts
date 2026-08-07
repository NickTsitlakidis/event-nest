/* eslint-disable */
export default {
    displayName: "mongodb",
    preset: "../../jest.preset.js",
    testEnvironment: "node",
    transform: {
        "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }]
    },
    moduleFileExtensions: ["ts", "js", "html"],
    coverageDirectory: "../../coverage/libs/mongodb",
    collectCoverage: true,
    collectCoverageFrom: ["src/**/*.ts", "!src/**/index.ts"],
    resetMocks: true
};
