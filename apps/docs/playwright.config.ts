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
        // Invoke vite directly: `pnpm exec` (pnpm >= 11.27) spawns its child in a separate process group when no
        // terminal is attached, so Playwright cannot kill the preview server and the run never exits.
        command: "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        url: `${origin}${basePath || "/"}`
    }
});
