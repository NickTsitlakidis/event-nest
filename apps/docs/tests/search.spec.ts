import { expect, test } from "@playwright/test";

interface SearchEntry {
    content: string;
    path: string;
}

const basePath = process.env.BASE_PATH ?? "";

test("the search index keeps API symbols from code examples", async ({ request }) => {
    const response = await request.get(`${basePath}/search-index.json`);
    expect(response.ok()).toBe(true);

    const entries = (await response.json()) as SearchEntry[];
    const postgreSqlPage = entries.find(({ path }) => path === "/storage/postgresql/");

    expect(postgreSqlPage?.content).toContain("EventNestPostgreSQLModule");
});

test("search ranks relevant pages and supports keyboard navigation", async ({ page }) => {
    await page.goto(`${basePath}/storage/postgresql/`);
    await page.keyboard.press("Control+k");

    const dialog = page.getByRole("dialog", { name: "Search documentation" });
    const input = dialog.getByRole("searchbox", { name: "Search documentation" });
    await expect(dialog).toBeVisible();
    await expect(input).toBeFocused();

    await input.fill("uuid mongo");
    const firstResult = dialog.getByRole("link").first();
    await expect(firstResult).toContainText("MongoDB");
    await expect(firstResult.locator("span")).toContainText(/mongo/i);

    await input.press("ArrowDown");
    await expect(firstResult).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(input).toBeFocused();

    await input.press("Enter");
    await page.waitForURL(`**${basePath}/storage/mongodb/`);
});

test("search reports an index failure and can retry", async ({ page }) => {
    let shouldFailRequest = true;
    await page.route("**/search-index.json", async (route) => {
        if (shouldFailRequest) {
            shouldFailRequest = false;
            await route.fulfill({ body: "Unavailable", status: 503 });
        } else {
            await route.continue();
        }
    });

    await page.goto(`${basePath}/`);
    await page.getByRole("button", { name: "Search documentation" }).click();

    const dialog = page.getByRole("dialog", { name: "Search documentation" });
    await expect(dialog.getByRole("alert")).toContainText("Search is temporarily unavailable.");
    await dialog.getByRole("button", { name: "Retry" }).click();
    await expect(dialog.getByRole("alert")).toHaveCount(0);

    await dialog.getByRole("searchbox", { name: "Search documentation" }).fill("snapshots");
    await expect(dialog.getByRole("link").first()).toBeVisible();
});
