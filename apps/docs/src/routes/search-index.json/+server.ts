const pages = import.meta.glob("/src/routes/**/+page.md", { eager: true, import: "default", query: "?raw" }) as Record<
    string,
    string
>;

export const prerender = true;

export function GET(): Response {
    const index = Object.entries(pages).map(([file, markdown]) => {
        const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
        const route = file.replace("/src/routes", "").replace("/+page.md", "/");
        return {
            content: plainText(markdown),
            description: field(frontmatter, "description"),
            path: route === "//" ? "/" : route,
            title: field(frontmatter, "title") || "Event Nest"
        };
    });

    return Response.json(index, {
        headers: { "cache-control": "public, max-age=3600", "content-type": "application/json" }
    });
}

function field(frontmatter: string, name: string): string {
    return frontmatter.match(new RegExp(String.raw`^${name}:\s*["']?(.+?)["']?$`, "m"))?.[1] ?? "";
}

function plainText(markdown: string): string {
    return markdown
        .replace(/^---[\s\S]*?---/, "")
        .replaceAll(/<script[\s\S]*?<\/script>/g, " ")
        .replaceAll(/```[\s\S]*?```/g, " ")
        .replaceAll(/\[([^\]]+)]\([^)]+\)/g, "$1")
        .replaceAll(/<[^>]+>/g, " ")
        .replaceAll(/[#*`_[\](){}>|-]/g, " ")
        .replaceAll(/\s+/g, " ")
        .trim();
}
