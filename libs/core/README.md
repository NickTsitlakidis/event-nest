# <img src="apps/docs/static/event-nest.svg" width="35" alt="" align="top"> Event Nest

A collection of [NestJS](https://nestjs.com/) libraries for building event-sourced applications.

![build status](https://github.com/NickTsitlakidis/event-nest/actions/workflows/checks.yml/badge.svg)
[![npm version](https://badge.fury.io/js/@event-nest%2Fcore.svg)](https://badge.fury.io/js/@event-nest%2Fcore)
[![Coverage Status](https://coveralls.io/repos/github/NickTsitlakidis/event-nest/badge.svg?branch=main)](https://coveralls.io/github/NickTsitlakidis/event-nest?branch=main)

## Documentation

Read the [Event Nest documentation](https://nicktsitlakidis.github.io/event-nest/) or start with [Build Your First Aggregate](https://nicktsitlakidis.github.io/event-nest/build-your-first-aggregate/installation/).

## Features

- Domain events and aggregate roots with event replay.
- Transactional event persistence through MongoDB, PostgreSQL, or Microsoft SQL Server.
- Optimistic concurrency through aggregate stream versions.
- Optional snapshots with composable synchronous or asynchronous policies.
- In-process NestJS domain subscriptions after persistence.
- Aggregate purging for explicit administrative deletion workflows.

Event Nest is a focused set of libraries, not a complete application framework, ORM, or distributed event bus.

## Installation

Install core and one persistence adapter:

```bash
pnpm add @event-nest/core @event-nest/postgresql pg
```

Replace `@event-nest/postgresql pg` with `@event-nest/mongodb mongodb` or `@event-nest/mssql tedious` for another adapter. See the [installation guide](https://nicktsitlakidis.github.io/event-nest/build-your-first-aggregate/installation/) for module configuration.

## Packages

| Package | Purpose |
| --- | --- |
| [`@event-nest/core`](https://www.npmjs.com/package/@event-nest/core) | Aggregate, event, repository, snapshot, and subscription primitives |
| [`@event-nest/mongodb`](https://www.npmjs.com/package/@event-nest/mongodb) | MongoDB event and snapshot storage |
| [`@event-nest/postgresql`](https://www.npmjs.com/package/@event-nest/postgresql) | PostgreSQL event and snapshot storage |
| [`@event-nest/mssql`](https://www.npmjs.com/package/@event-nest/mssql) | Microsoft SQL Server event and snapshot storage |

## Compatibility

Event Nest requires Node.js 22 or later and supports NestJS 10 and 11. See the [compatibility reference](https://nicktsitlakidis.github.io/event-nest/help/compatibility/) for exact driver peer ranges and migration notes.

## License

Event Nest is [MIT licensed](LICENSE).
