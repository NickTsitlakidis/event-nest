---
title: Compatibility
description: Supported Node.js, NestJS, database driver, and package versions for Event Nest 6.0.0.
---

This matrix reflects the published 6.0.0 package manifests. Peer ranges describe supported consumer installations; the repository toolchain can be stricter.

## Runtime matrix

| Component | Supported by Event Nest 6.0.0 | Notes |
| --- | --- | --- |
| Node.js | `>=22` | All four published packages declare `>= 22`. Node 20 support was dropped in 6.0.0. |
| Repository development Node.js | `>=22.13` | The monorepo root requires this for contributors and documentation builds; it is not the published consumer minimum. |
| NestJS `@nestjs/common` | `^10.0.0 \|\| ^11.0.0` | Peer of core and every adapter. Nest 9 support was dropped in 4.0.0. |
| NestJS `@nestjs/core` | `^10.0.0 \|\| ^11.0.0` | Keep the Nest core/common majors aligned. |
| `reflect-metadata` | `^0.1.12 \|\| ^0.2.0` | Required peer for decorator metadata. |
| RxJS | `^7.2.0` | Required peer. |
| MongoDB Node.js driver | `^7.0.0` | Required by `@event-nest/mongodb`; MongoDB 6.x drivers are outside the 6.0.0 range. |
| PostgreSQL `pg` driver | `^8.14.1` | Semver range `>=8.14.1 <9.0.0`. |
| SQL Server `tedious` driver | `^20.0.0` | Semver range `>=20.0.0 <21.0.0`. |

Each adapter package depends on exactly `@event-nest/core` `6.0.0`. Keep Event Nest package versions aligned rather than mixing majors or minors.

## Adapter requirements

### MongoDB

- Transactions are part of save and purge behavior; use a transaction-capable replica set or sharded deployment.
- `mongoClientConfiguration` is typed as MongoDB driver's `MongoClientOptions` and passed through unchanged.
- Event Nest does not create MongoDB collections or indexes during bootstrap.

### PostgreSQL

- Install `pg` separately because it is a peer dependency.
- Pool options are passed to Knex/Tarn; availability and defaults beyond the documented Event Nest fields follow the installed internal dependencies.
- Automatic table creation requires an existing schema and sufficient DDL permissions.

### Microsoft SQL Server

- Install `tedious` separately because it is a peer dependency.
- Event Nest uses Tedious through Knex, enables encryption by default, does not trust the server certificate by default, and uses UTC.
- SQL Server identifiers are limited to 128 characters and the module accepts schema/table names separately.
- Automatic table creation requires an existing schema and sufficient DDL permissions.

## TypeScript and module format

The packages publish CommonJS entry points and declarations through package-root exports. Import only from `@event-nest/core`, `@event-nest/mongodb`, `@event-nest/postgresql`, or `@event-nest/mssql`; deep source paths are not declared package exports.

TypeScript is not a published peer dependency, so the repository's TypeScript version is not a consumer support promise. Decorators must be compiled in a NestJS-compatible setup with metadata available at runtime.

## Current deprecations

| API | Status in 6.0.0 | Replacement | Removal |
| --- | --- | --- | --- |
| `@AggregateRootName("Name")` | Deprecated since 5.0.0, still exported | `@AggregateRootConfig({ name: "Name" })` | Planned for 7.x |

See [configuration](/api-reference/configuration/) and [public API](/api-reference/public-api/).

## Sources

- [Core package manifest](https://github.com/NickTsitlakidis/event-nest/blob/main/libs/core/package.json)
- [MongoDB package manifest](https://github.com/NickTsitlakidis/event-nest/blob/main/libs/mongodb/package.json)
- [PostgreSQL package manifest](https://github.com/NickTsitlakidis/event-nest/blob/main/libs/postgresql/package.json)
- [SQL Server package manifest](https://github.com/NickTsitlakidis/event-nest/blob/main/libs/mssql/package.json)
- [Repository package manifest](https://github.com/NickTsitlakidis/event-nest/blob/main/package.json)
