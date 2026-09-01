import { SITE_ORIGIN } from "$lib/site";

const pages = import.meta.glob("/src/routes/**/+page.md", { eager: true, import: "default", query: "?raw" });

export const prerender = true;

export function GET(): Response {
    const origin = `${SITE_ORIGIN}/event-nest`;
    const urls = Object.keys(pages)
        .map((file) => file.replace("/src/routes", "").replace("/+page.md", "/"))
        .map((route) => `<url><loc>${origin}${route === "//" ? "/" : route}</loc></url>`)
        .join("");

    return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
        {
            headers: { "content-type": "application/xml" }
        }
    );
}
