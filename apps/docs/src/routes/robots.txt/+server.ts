import { basePath, SITE_ORIGIN } from "#lib/site.js";

export const prerender = true;

export function GET(): Response {
    const base = basePath();
    return new Response(`User-agent: *\nAllow: ${base}/\nSitemap: ${SITE_ORIGIN}${base}/sitemap.xml\n`, {
        headers: { "content-type": "text/plain" }
    });
}
