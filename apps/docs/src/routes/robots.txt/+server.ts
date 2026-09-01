import { base } from "$app/paths";
import { SITE_ORIGIN } from "$lib/site";

export const prerender = true;

export function GET(): Response {
    return new Response(`User-agent: *\nAllow: ${base}/\nSitemap: ${SITE_ORIGIN}${base}/sitemap.xml\n`, {
        headers: { "content-type": "text/plain" }
    });
}
