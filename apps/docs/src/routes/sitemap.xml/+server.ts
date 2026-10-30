import { base } from "$app/paths";
import { SITE_ORIGIN } from "$lib/site";
import { execFileSync } from "node:child_process";

const pages = import.meta.glob("/src/routes/**/+page.md", { eager: true, import: "default", query: "?raw" });

export const prerender = true;

export function GET(): Response {
    const origin = `${SITE_ORIGIN}${base}`;
    const urls = Object.keys(pages)
        .map((file) => {
            const route = file.replace("/src/routes", "").replace("/+page.md", "/");
            const lastModified = getLastCommitDate(file);
            const lastmod = lastModified ? `<lastmod>${lastModified}</lastmod>` : "";
            return `<url><loc>${origin}${route === "//" ? "/" : route}</loc>${lastmod}</url>`;
        })
        .join("");

    return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
        {
            headers: { "content-type": "application/xml" }
        }
    );
}

function git(...arguments_: string[]): string {
    return execFileSync("git", arguments_, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

// Prerendering runs with apps/docs as the working directory; glob keys are rooted at that directory.
// The committer date of the page's latest commit is the lastmod Google uses to schedule recrawls.
// A shallow clone reports HEAD's date for every file, which would make every page look freshly
// changed; omit lastmod there rather than publish dates that are wrong.
const isShallowClone = ((): boolean => {
    try {
        return git("rev-parse", "--is-shallow-repository") === "true";
    } catch {
        return true;
    }
})();

function getLastCommitDate(file: string): string | undefined {
    if (isShallowClone) {
        return undefined;
    }

    try {
        return git("log", "-1", "--format=%cI", "--", `.${file}`) || undefined;
    } catch {
        return undefined;
    }
}
