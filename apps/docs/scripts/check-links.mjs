import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "../../dist/apps/docs");
const files = [];
const htmlCache = new Map();

function hasAnchor(file, href) {
    const fragment = href.split("#", 2)[1];
    if (!fragment || !file.endsWith(".html")) return true;

    const html = htmlCache.get(file) ?? readFileSync(file, "utf8");
    htmlCache.set(file, html);
    return html.includes(`id="${decodeURIComponent(fragment)}"`);
}

function isExternal(href) {
    return /^(https?:|mailto:|javascript:)/.test(href);
}

function targetFor(href, currentFile) {
    if (href.startsWith("#")) return currentFile;
    const withoutBase = href.replace(/^\/event-nest/, "");
    const routePath = withoutBase.split("#", 1)[0].split("?", 1)[0] || "/";
    if (/\.[a-z0-9]+$/i.test(routePath)) {
        return path.resolve(root, `.${routePath}`);
    }
    return routePath.endsWith(".html")
        ? path.resolve(root, `.${routePath}`)
        : path.resolve(root, `.${routePath}`, "index.html");
}

function walk(directory) {
    for (const entry of readdirSync(directory)) {
        const filePath = path.resolve(directory, entry);
        if (statSync(filePath).isDirectory()) walk(filePath);
        else if (filePath.endsWith(".html")) files.push(filePath);
    }
}

walk(root);
const errors = [];
for (const requiredFile of ["robots.txt", "search-index.json", "sitemap.xml"]) {
    if (!existsSync(path.resolve(root, requiredFile))) errors.push(`Missing generated file: ${requiredFile}`);
}
for (const file of files) {
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(/href="([^"]+)"/g)) {
        const href = match[1];
        if (!isExternal(href)) {
            const target = targetFor(href, file);
            if (!existsSync(target)) errors.push(`${file.replace(root, "")}: ${href}`);
            else if (!hasAnchor(target, href)) errors.push(`${file.replace(root, "")}: missing anchor ${href}`);
        }
    }
}

if (errors.length > 0) {
    throw new Error(`Broken internal links:\n${errors.join("\n")}`);
}

console.log(`Checked ${files.length} generated HTML files; no broken internal links found.`);
