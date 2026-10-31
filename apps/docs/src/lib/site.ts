import { resolve } from "$app/paths";

// Canonical production origin of the deployed site (GitHub Pages). SvelteKit's `base` covers only
// the "/event-nest" path segment, so the host has no framework-provided home; import it from here
// instead of repeating the URL.
export const SITE_ORIGIN = "https://nicktsitlakidis.github.io";

// SvelteKit 3 removed the `base` export from $app/paths; resolving the root route is the supported
// way to recover the deployment prefix ("" locally, "/event-nest" on GitHub Pages).
export function basePath(): string {
    return resolve("/").replace(/\/$/, "");
}

export const CURRENT_VERSION = "6.1.0";
