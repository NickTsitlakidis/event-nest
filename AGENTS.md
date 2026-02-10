# AGENTS.md

## Purpose

This file is for AI coding agents working in this repository.

Goals:

- Make correct, minimal, test-backed changes.
- Follow existing architecture and conventions.
- Avoid unrelated edits and noisy diffs.
- Leave clear handoff notes (what changed, why, how it was verified).

## Repo Map

- `libs/core`: domain/event-sourcing primitives (aggregate root, event store contracts, decorators, subscriptions, snapshot strategies).
- `libs/mongodb`: MongoDB adapter module and stores.
- `libs/postgresql`: PostgreSQL adapter module and stores.
- `apps/example`: usage example app; useful reference, not the canonical architecture source.

## Read First (Before Editing)

Read these in order:

1. `README.md`
2. Target library README (if present):
    - `libs/core/README.md`
    - `libs/mongodb/README.md`
    - `libs/postgresql/README.md`
3. The exact implementation file you plan to change.
4. The matching spec file(s) for that implementation.

## Prerequisites and Environment

- Node: `>=20`
- Package manager: `pnpm`
- Workspace: Nx monorepo

Testing dependencies:

- PostgreSQL integration tests use Testcontainers -> Docker must be available/running.
- MongoDB tests rely on jest-mongodb environment (`MONGO_URL` provided by test setup).

## Canonical Commands

Install:

```bash
pnpm install
```

Discover projects:

```bash
pnpm nx show projects
```

Repo-wide checks used by maintainers:

```bash
pnpm lint
pnpm test
```

Targeted checks (preferred during iteration):

```bash
pnpm nx lint core
pnpm nx lint mongodb
pnpm nx lint postgresql

pnpm nx test core
pnpm nx test mongodb
pnpm nx test postgresql

pnpm nx build core
pnpm nx build mongodb
pnpm nx build postgresql
```

Pre-commit behavior:

```bash
pnpm commit-checks
```

## Workflow for Agents

- Understand behavior from existing tests before modifying logic.
- Keep edits scoped to the request; do not refactor unrelated areas.
- Prefer updating/adding tests in the same change when behavior changes.
- Run targeted lint/test for touched projects first.
- Run broader checks only when change scope justifies it.
- If infra prerequisites are missing (for example Docker), report what could not be verified.

## Architecture Invariants (Do Not Break)

- Domain event classes must be decorated with `@DomainEvent(...)`.
- Aggregate roots must define aggregate name metadata (`@AggregateRootConfig(...)` or equivalent supported decorator path).
- Snapshot-aware aggregates must have valid snapshot revision metadata and implement snapshot methods correctly.
- Event store concurrency/version checks are core behavior; do not bypass them.
- Snapshots are optional, but when enabled:
    - MongoDB requires both `snapshotStrategy` and `snapshotCollection`.
    - PostgreSQL requires both `snapshotStrategy` and `snapshotTableName`.
- Subscriptions run after events are persisted; subscription failures do not imply storage rollback.

## Lint and Formatting Policy

- `pnpm lint` intentionally runs with `--fix` in this repository.
- Expect auto-fix formatting/import order changes.
- Still keep diffs focused; avoid touching unrelated files just because auto-fix can.

## Change Scope Rules

- Prefer smallest viable change.
- Do not rename/move files unless required by the task.
- Do not edit generated/build artifacts (`dist`, coverage, cache outputs).
- Do not alter CI/workflow/tooling unless task explicitly requires it.
- Do not modify release/publish scripts unless asked.

## Testing Expectations

For each behavior/code change:

- Add/adjust tests close to the changed code.
- At minimum run:
    - lint for touched project(s)
    - tests for touched project(s)
- If you cannot run required tests locally, explicitly state why and what remains to verify.

## Handoff Format (In Final Response)

Always include:

- Files changed (paths).
- Behavior change in 1-3 bullets.
- Commands executed.
- Test/lint/build results.
- Any assumptions, risks, or unverified areas.
