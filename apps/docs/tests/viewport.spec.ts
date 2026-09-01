/* eslint-disable unicorn/isolated-functions -- Playwright evaluate callbacks run in the browser. */
import { expect, test } from "@playwright/test";
import { readdirSync } from "node:fs";
import path from "node:path";

const buildDirectory = path.resolve(import.meta.dirname, "../../../dist/apps/docs");
const basePath = process.env.BASE_PATH ?? "";
const viewports = [
    { height: 800, name: "narrow mobile", width: 320 },
    { height: 812, name: "phone", width: 375 },
    { height: 1024, name: "tablet", width: 768 },
    { height: 800, name: "desktop", width: 1280 }
] as const;

function findGeneratedRoutes(directory = buildDirectory): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            return findGeneratedRoutes(entryPath);
        }
        if (entry.name !== "index.html") {
            return [];
        }

        const relativeDirectory = path.relative(buildDirectory, directory).split(path.sep).join("/");
        return [relativeDirectory ? `/${relativeDirectory}/` : "/"];
    });
}

const routes = findGeneratedRoutes().toSorted((left, right) => left.localeCompare(right));

for (const viewport of viewports) {
    test(`generated pages fit the ${viewport.name} viewport`, async ({ page }) => {
        await page.setViewportSize(viewport);

        for (const route of routes) {
            await test.step(route, async () => {
                const response = await page.goto(`${basePath}${route}`);
                const loaded = response?.ok() ?? false;
                expect.soft(loaded, `Expected ${route} to load successfully`).toBe(true);
                if (!loaded) {
                    return;
                }

                const dimensions = await page.evaluate(() => ({
                    clientWidth: document.documentElement.clientWidth,
                    scrollWidth: document.documentElement.scrollWidth
                }));

                expect
                    .soft(
                        dimensions.scrollWidth,
                        `${route} overflows by ${dimensions.scrollWidth - dimensions.clientWidth}px at ${viewport.width}px`
                    )
                    .toBeLessThanOrEqual(dimensions.clientWidth);
            });
        }
    });
}
