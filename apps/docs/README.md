# Event Nest documentation application

This Nx application is the SveltePress source for the Event Nest documentation site.

## Baseline inventory

- Source routes: `apps/docs/src/routes`.
- Shared components and diagrams: `apps/docs/src/lib`.
- Static assets: `apps/docs/static`.
- Production output: `dist/apps/docs`.
- Framework: SveltePress default theme with SvelteKit's static adapter.
- Deployment base path: `/event-nest`, supplied through `BASE_PATH`.
- Route style: prerendered pages with trailing slashes and a static `404.html` fallback.
- Search: local browser search over a prerendered JSON index; no hosted service.
- Deployment: `.github/workflows/pages.yml` uploads static output to GitHub Pages.

The repository did not contain a reusable logo asset when the documentation work began. Temporary Event Nest logo, favicon, and social-card SVGs are isolated under `apps/docs/static` and brand colors are centralized in `apps/docs/src/app.css` and the theme configuration.

## Commands

Run commands from the workspace root:

```bash
pnpm nx serve docs
pnpm nx check docs
pnpm nx lint docs
BASE_PATH=/event-nest pnpm nx build docs
BASE_PATH=/event-nest pnpm nx links docs
pnpm nx preview docs
```

The `links` target depends on the production build and checks generated internal page, asset, and metadata links.

## Authoring conventions

- Every page uses `title` and `description` frontmatter.
- The theme renders the page title, so article Markdown starts with introductory text or an `h2`.
- Internal links use absolute public routes with trailing slashes; SveltePress applies the configured base.
- The implementation, matching specs, package barrels, and package manifests are the source of truth.
- The canonical tutorial uses `UserCreatedEvent`, `UserNameChangedEvent`, and a `User` aggregate.
