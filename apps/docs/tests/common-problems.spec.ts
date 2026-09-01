import { expect, test } from "@playwright/test";

const basePath = process.env.BASE_PATH ?? "";

test("common problems exposes categories in the sidebar and stable symptom links", async ({ page }) => {
    await page.goto(`${basePath}/help/common-problems/`);

    await expect(page.locator(".toc .anchors a")).toHaveText([
        "Nest wiring",
        "Event registration and replay",
        "Concurrency and versions",
        "Snapshots",
        "Subscriptions",
        "Storage adapters"
    ]);

    const symptomLinks = page.locator("#find-your-problem + ul a");
    await expect(symptomLinks).toHaveCount(22);

    const links = await symptomLinks.all();
    for (const link of links) {
        const target = await link.getAttribute("href");
        expect(target).toMatch(/^#[a-z0-9-]+$/);
        await expect(page.locator(target!)).toHaveCount(1);
    }
});
