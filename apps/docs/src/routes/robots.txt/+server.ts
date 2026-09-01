export const prerender = true;

export function GET(): Response {
    return new Response(
        "User-agent: *\nAllow: /event-nest/\nSitemap: https://nicktsitlakidis.github.io/event-nest/sitemap.xml\n",
        {
            headers: { "content-type": "text/plain" }
        }
    );
}
