## 5.0.0 (2026-02-22)

### 🚀 Features

- **core,mongodb,postgresql**: Added snapshot support for snapshot-aware aggregates, including configurable snapshot strategies and `findWithSnapshot` retrieval. ([#47](https://github.com/NickTsitlakidis/event-nest/pull/47))

### ⚠️ Deprecations

- **core**: Deprecated `@AggregateRootName` in favor of `@AggregateRootConfig` (planned removal in 7.x).

### 🩹 Fixes

- **postgresql**: `SchemaConfiguration` is now exported from `@event-nest/postgresql`.

#### ⚠️ Breaking Changes

- **core**: Removed the deprecated `appendedEvents` getter from `AggregateRoot`.
- **core**: The `EventStore` interface now includes a new method to be implemented: `findWithSnapshot`
- **core**: The constructor of `AbstractEventStore` now requires a second parameter of type `AbstractSnapshotStore`.
- **postgresql**: Removed the deprecated `aggregatesTableName` getter from `PostgreSQLEventStore`
- **postgresql**: Removed the deprecated `eventsTableName` getter from `PostgreSQLEventStore`
- **postgresql**: Removed the deprecated `schemaName` getter from `PostgreSQLEventStore`
- **postgresql**: The constructor of `PostgreSQLEventStore` now requires four parameters: `DomainEventEmitter`, `PostgreSQLSnapshotStore`, `SchemaConfiguration`, `Knex`
- **mongodb**: The constructor of `MongoEventStore` now requires an additional `MongoSnapshotStore` parameter

### Contributors

- Nick Tsitlakidis
- vilgeforc5

## 4.0.2 (2025-11-14)

### 🩹 Fixes

- **core,mongodb,postgresql:** Fixing peer dependency version for @nestjs/common ([9b6746d](https://github.com/NickTsitlakidis/event-nest/commit/9b6746d))

### Contributors

- Nick Tsitlakidis

## 4.0.1 (2025-11-13)

### 🩹 Fixes

- **core:** Domain event subscription decorator is now skipping duplicate event classes. ([#45](https://github.com/NickTsitlakidis/event-nest/pull/45))

# 4.0.0 (2025-04-24)

### 🚀 Features

- ⚠️ Supporting Nest.js 11.x and dropping support for 9.x. Dropping support for node.js 18.x ([22b892a](https://github.com/NickTsitlakidis/event-nest/commit/22b892a))
- **core:** Improved typing in the commit method to return the aggregate root subclass ([9a3d474](https://github.com/NickTsitlakidis/event-nest/commit/9a3d474))
- **mongodb:** Adding support for MongoDb client configuration ([77069f3](https://github.com/NickTsitlakidis/event-nest/commit/77069f3))
- **postgresql:** Adding support for Knex.js connection pool configuration ([00c625a](https://github.com/NickTsitlakidis/event-nest/commit/00c625a))

#### ⚠️ Breaking Changes

- ⚠️ Supporting Nest.js 11.x and dropping support for 9.x. Dropping support for node.js 18.x ([22b892a](https://github.com/NickTsitlakidis/event-nest/commit/22b892a))

## 3.4.2 (2025-02-12)

### 🩹 Fixes

- **core:** Using unique event names for the UnknownEventException in aggregate root ([49bdadee](https://github.com/NickTsitlakidis/event-nest/commit/49bdadee))
- **core:** Adding nil check in ApplyEvent decorator and throwing exception ([77192b83](https://github.com/NickTsitlakidis/event-nest/commit/77192b83))
- **core:** Deprecation of the appendedEvents getter in favor of a more descriptive name : uncommittedEvents ([cada84cf](https://github.com/NickTsitlakidis/event-nest/commit/cada84cf))

## 3.4.1 (2025-01-30)

### 🩹 Fixes

- **core:** Handle subscription exceptions in commit method and clear published events ([f3f64392](https://github.com/NickTsitlakidis/event-nest/commit/f3f64392))
- **core:** Setting radash as a dependency instead of peer dependency ([c9f6c90f](https://github.com/NickTsitlakidis/event-nest/commit/c9f6c90f))

## 3.4.0 (2025-01-16)

### 🚀 Features

- **core:** Allow configuration of synchronous/asynchronous subscriptions ([#43](https://github.com/NickTsitlakidis/event-nest/pull/43))

## 3.3.2 (2024-11-30)

### 🩹 Fixes

- **core:** Fixing the class parameter in event store to allow private and protected constructors. ([f157b38](https://github.com/NickTsitlakidis/event-nest/commit/f157b38))

## 3.3.1 (2024-11-30)

### 🩹 Fixes

- Setting correct min node version in library package files ([726cef6](https://github.com/NickTsitlakidis/event-nest/commit/726cef6))
- **postgresql:** Table initialization is now aware of schema name ([a6da091](https://github.com/NickTsitlakidis/event-nest/commit/a6da091))

## 3.3.0 (2024-11-24)

### 🚀 Features

- New configuration flag to initialize Postgresql tables on application bootstrap. ([#38](https://github.com/NickTsitlakidis/event-nest/pull/38))

## 3.2.1 (2024-09-04)

### 🩹 Fixes

- Event store implementations are exported properly from their modules ([c1fe9ba](https://github.com/NickTsitlakidis/event-nest/commit/c1fe9ba))

## 3.2.0 (2024-08-05)

### 🚀 Features

- Adding support for scoped module registration in Postgres library ([c19a72c](https://github.com/NickTsitlakidis/event-nest/commit/c19a72c))
- Adding support for scoped module registration in MongoDB library ([96f800c](https://github.com/NickTsitlakidis/event-nest/commit/96f800c))

## 3.1.0 (2024-07-03)

### 🚀 Features

- Addition of event store method to retrieve events of a specific aggregate root class based on multiple entity ids. ([ead4e8f](https://github.com/NickTsitlakidis/event-nest/commit/ead4e8f))

### 🩹 Fixes

- Upgrading mongo,nest and reflect-metadata dependencies to resolve security issues. ([617d475](https://github.com/NickTsitlakidis/event-nest/commit/617d475))

## 3.0.1 (2024-06-10)

### 🩹 Fixes

- **core:** Fixing parameter type of domain event subscription to accept only rest parameters ([edab002](https://github.com/NickTsitlakidis/event-nest/commit/edab002))
- **postgresql:** Database connection is now using default ssl options if an options parameter is not given. ([fe5c5fa](https://github.com/NickTsitlakidis/event-nest/commit/fe5c5fa))

# 3.0.0 (2024-06-04)

### 🚀 Features

- ⚠️ Renaming EventProcessor decorator to ApplyEvent. ([22f4f71](https://github.com/NickTsitlakidis/event-nest/commit/22f4f71))
- Removing uuid library dependency and using native crypto random uuid function. ([01e2860](https://github.com/NickTsitlakidis/event-nest/commit/01e2860))
- ⚠️ Setting minimum node version to 18.x ([be5b68c](https://github.com/NickTsitlakidis/event-nest/commit/be5b68c))

### 🩹 Fixes

- Appended events are not cleared if the commit operation fails ([13234f4](https://github.com/NickTsitlakidis/event-nest/commit/13234f4))

#### ⚠️ Breaking Changes

- ⚠️ Renaming EventProcessor decorator to ApplyEvent. ([22f4f71](https://github.com/NickTsitlakidis/event-nest/commit/22f4f71))
- ⚠️ Setting minimum node version to 18.x ([be5b68c](https://github.com/NickTsitlakidis/event-nest/commit/be5b68c))
