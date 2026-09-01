import { defineConfig } from "@playwright/test";

const basePath = process.env.BASE_PATH ?? "";
const origin = "http://127.0.0.1:4173";

export default defineConfig({
    forbidOnly: Boolean(process.env.CI),
    outputDir: "../../test-results/apps/docs/viewport",
    projects: [{ name: "chromium", use: { browserName: "chromium" } }],
    reporter: process.env.CI ? "github" : "line",
    testDir: "./tests",
    use: {
        baseURL: `${origin}${basePath}`,
        trace: "retain-on-failure"
    },
    webServer: {
        command: "pnpm exec vite preview --host 127.0.0.1 --port 4173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        url: `${origin}${basePath || "/"}`
    }
});
