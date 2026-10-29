import { expect, test } from "@playwright/test";

const basePath = process.env.BASE_PATH ?? "";

test("every sitemap entry carries a W3C datetime lastmod", async ({ request }) => {
    const response = await request.get(`${basePath}/sitemap.xml`);
    expect(response.ok()).toBe(true);

    const xml = await response.text();
    const entries = xml
        .matchAll(/<url>([\s\S]*?)<\/url>/g)
        .map(([, inner]) => inner)
        .toArray();
    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries) {
        expect(entry, `missing lastmod in ${entry}`).toMatch(
            /<lastmod>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)<\/lastmod>/
        );
    }
});
