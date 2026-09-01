import { SITE_ORIGIN } from "$lib/site";

export const prerender = true;

export function GET(): Response {
    return new Response(`User-agent: *\nAllow: /event-nest/\nSitemap: ${SITE_ORIGIN}/event-nest/sitemap.xml\n`, {
        headers: { "content-type": "text/plain" }
    });
}
