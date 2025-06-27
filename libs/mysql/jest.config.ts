export default {
    coverageDirectory: "../../coverage/libs/mysql",
    displayName: "mysql",
    moduleFileExtensions: ["ts", "js", "html"],
    preset: "../../jest.preset.js",
    setupFilesAfterEnv: ["jest-extended/all"],
    testEnvironment: "node",
    transform: {
        "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }]
    }
};
