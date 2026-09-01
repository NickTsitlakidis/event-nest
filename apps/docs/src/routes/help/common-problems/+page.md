---
title: Common Problems
description: Source-aligned diagnosis and resolution steps for Event Nest configuration, replay, persistence, snapshots, and subscriptions.
---

Use the exact error name or start with the part of Event Nest that is failing.

<h2 id="find-your-problem">Find your problem</h2>

- **Nest wiring:** [Missing event publisher](#missing-event-publisher), [`EVENT_STORE` cannot be injected](#event-store-injection)
- **Event registration and replay:** [Unregistered event on append](#unregistered-event-append), [`UnknownEventException` during replay](#unknown-event-replay), [undefined `@ApplyEvent` class](#undefined-apply-event-class), [event name conflict](#event-name-conflict), [missing aggregate name](#missing-aggregate-name)
- **Concurrency and versions:** [Concurrent write conflict](#event-concurrency), [invalid explicit aggregate version](#invalid-explicit-version)
- **Snapshots:** [Incomplete configuration](#snapshot-config-pair), [aggregate is not snapshot-aware](#snapshot-aware), [invalid strategy construction](#snapshot-strategy-constructor), [revision mismatch](#snapshot-revision-mismatch), [load resumes at version 0](#snapshot-load-version-zero)
- **Subscriptions:** [Handlers are not discovered](#subscriptions-not-discovered), [asynchronous failure does not reject `commit()`](#async-subscription-failure), [`SubscriptionException` after persistence](#subscription-exception-after-persistence)
- **Storage adapters:** [SQL tables are not created](#sql-table-creation), [MongoDB transaction failure](#mongodb-transactions), [MongoDB rejects an aggregate ID](#mongodb-aggregate-id), [PostgreSQL SSL failure](#postgresql-ssl), [SQL Server configuration rejection](#sql-server-configuration)

## Nest wiring

<h3 id="missing-event-publisher">Missing event publisher</h3>

**Symptom:** Calling `commit()` rejects with the string `There is no event publisher assigned`.

**Likely cause:** The aggregate was constructed or reconstituted directly and never connected to an `EventStore`.

**How to confirm:** Check whether the aggregate came from `AggregateRepository.load()` or was passed through `eventStore.addPublisher()`. Merely injecting the store elsewhere does not modify the aggregate.

**Resolution:** Call `eventStore.addPublisher(aggregate)` before `commit()`, use `AggregateRepository.save()`, or load through `AggregateRepository`, which returns an already connected instance. A commit with no uncommitted events is a no-op and does not invoke the publisher.

**Related docs:** [Public API](/api-reference/public-api/) and [AggregateRepository](/capabilities/aggregate-repository/).

<h3 id="event-store-injection"><code>EVENT_STORE</code> cannot be injected</h3>

**Symptom:** Nest reports that it cannot resolve the `EVENT_STORE` dependency.

**Likely cause:** A scoped `register`/`registerAsync` module is not imported where the consumer is declared, or an async factory dependency is not visible. Async option types do not support an `imports` field.

**How to confirm:** Check whether registration used `forRoot*` (global) or `register*` (scoped), and whether every token in `inject` is already available in that module context.

**Resolution:** Import the scoped dynamic module into the consumer's module, re-export it as needed, or use one global `forRoot*` registration. Make async factory dependencies global or otherwise visible before registration.

**Related docs:** [Registration methods](/api-reference/configuration/) and [Public API](/api-reference/public-api/).

## Event registration and replay

<h3 id="unregistered-event-append">Unregistered event on append</h3>

**Symptom:** `append()` reports that an event class is not registered.

**Likely cause:** The class lacks `@DomainEvent`, the decorated module was never imported at runtime, or a different class copy/constructor was instantiated.

**How to confirm:** Verify the runtime class has the decorator and that the file is included in the application startup graph. Registration is process-local and keyed by constructor identity for writes.

**Resolution:** Decorate the event with a globally unique persisted name and import its defining module before using it. The thrown class is internal `UnregisteredEventException` and is not a public package export.

**Related docs:** [Decorators](/api-reference/decorators/) and [Exceptions](/api-reference/exceptions/).

<h3 id="unknown-event-replay"><code>UnknownEventException</code> during replay</h3>

**Symptom:** Reconstitution lists names under `Unregistered` or `Missing apply method`.

**Likely cause:** `Unregistered` means no loaded `@DomainEvent` registration matches the stored canonical name/alias. `Missing apply method` means the event class resolved, but this aggregate has no `@ApplyEvent` metadata for that exact class.

**How to confirm:** Inspect both lists in the exception message and compare database `event_name` values with decorators. Confirm the replay handler imports the same event class object.

**Resolution:** Load/register the event class, retain historical names in `aliases`, and add the missing `@ApplyEvent(EventClass)` handler. Do not edit historical event names without a deliberate migration.

**Related docs:** [Decorators](/api-reference/decorators/), [Event aliases](/capabilities/event-aliases/), and [Exceptions](/api-reference/exceptions/).

<h3 id="undefined-apply-event-class">Undefined <code>@ApplyEvent</code> class</h3>

**Symptom:** Application initialization reports that `@ApplyEvent` was used with a null or undefined event class.

**Likely cause:** A circular dependency or incorrect import left the event binding undefined when decorator evaluation ran.

**How to confirm:** Log or test the imported constructor before the aggregate class declaration and inspect import cycles. This fails when the decorator factory runs, not during event replay.

**Resolution:** Correct the import or break the cycle while retaining the same event class identity. The thrown `MissingEventClassException` is internal and cannot be imported from the public barrel.

**Related docs:** [Decorators](/api-reference/decorators/) and [Exceptions](/api-reference/exceptions/).

<h3 id="event-name-conflict">Event name conflict</h3>

**Symptom:** Startup throws `EventNameConflictException` before a command is handled.

**Likely cause:** A canonical event name or alias duplicates another canonical name/alias, or the same value appears twice in one event's registration.

**How to confirm:** Search all `@DomainEvent` names and `aliases` for the name in the exception message. Include libraries loaded more than once in the same process.

**Resolution:** Make every canonical name and alias globally unique. Keep aliases durable while historical events still use them.

**Related docs:** [Decorators](/api-reference/decorators/).

<h3 id="missing-aggregate-name">Missing aggregate name</h3>

**Symptom:** `MissingAggregateRootNameException` occurs during publish, event lookup, or snapshot lookup.

**Likely cause:** The aggregate class has no name metadata or the wrong undecorated class was supplied to the store.

**How to confirm:** Check the concrete class passed to `findByAggregateRootId`, `findWithSnapshot`, or `addPublisher`; inheritance/import mistakes can hide the expected decorated class.

**Resolution:** Add `@AggregateRootConfig({ name: "DurableName" })`. Preserve a name already stored in events. Although the exception text may mention `@AggregateRootName`, that decorator is deprecated and planned for removal in 7.x.

**Related docs:** [Decorators](/api-reference/decorators/).

## Concurrency and versions

<h3 id="event-concurrency">Concurrent write conflict</h3>

**Symptom:** A commit reports different expected and stored aggregate versions.

**Likely cause:** Another writer committed after this aggregate was loaded, the application reused a stale instance, or a snapshot-at-stream-head aggregate was reconstituted at version 0.

**How to confirm:** Compare the exception's expected/stored numbers with `findAggregateRootVersion(id)`. For snapshot loads with zero newer events, confirm the factory receives and forwards `aggregateRootVersion`.

**Resolution:** Reload and re-run the business command only if retrying is safe. Prefer `AggregateRepository`, or pass all four factory values through to `reconstitute(events, snapshot, aggregateRootVersion)`. Never bypass the version check.

**Related docs:** [Exceptions](/api-reference/exceptions/), [Event streams and versions](/core-model/event-streams-and-versions/), and [Snapshot loading](/how-event-nest-works/snapshot-loading/).

<h3 id="invalid-explicit-version">Invalid explicit aggregate version</h3>

**Symptom:** Reconstitution says `aggregateRootVersion` must be a non-negative integer.

**Likely cause:** A custom store/factory passed a negative, fractional, unsafe, or non-numeric value as the third argument.

**How to confirm:** Inspect the fourth factory argument and third `reconstitute()` argument. Omitting it is valid; when supplied it must satisfy `Number.isSafeInteger(value)` and be at least zero.

**Resolution:** Return the authoritative non-negative stream version from the store, or omit it only when replayed events can correctly determine the version.

**Related docs:** [Public API](/api-reference/public-api/) and [Exceptions](/api-reference/exceptions/).

## Snapshots

<h3 id="snapshot-config-pair">Incomplete snapshot configuration</h3>

**Symptom:** Provider creation says both snapshot fields must be supplied.

**Likely cause:** Only `snapshotStrategy` or only the adapter storage field was configured.

**How to confirm:** For MongoDB inspect `snapshotStrategy` plus `snapshotCollection`; for PostgreSQL/SQL Server inspect `snapshotStrategy` plus `snapshotTableName`. This is enforced by the option union and repeated at runtime for sync and async registration.

**Resolution:** Provide the pair or remove both to install `NoOpSnapshotStore`. There is no shared public snapshot-options object to configure separately.

**Related docs:** [Configuration](/api-reference/configuration/) and [Exceptions](/api-reference/exceptions/).

<h3 id="snapshot-aware">Aggregate is not snapshot-aware</h3>

**Symptom:** `AggregateClassNotSnapshotAwareException` or `AggregateInstanceNotSnapshotAwareException` occurs when a strategy matches.

**Likely cause:** The class omits numeric `snapshotRevision`, or the instance lacks callable `toSnapshot()` or `applySnapshot()` methods. A broad strategy can also match an aggregate not intended for snapshots.

**How to confirm:** Check all three requirements independently: aggregate name, numeric class revision, and both instance methods. TypeScript `implements SnapshotAware` does not exist at runtime.

**Resolution:** Complete `@AggregateRootConfig` and `SnapshotAware`, or compose the policy with `ForAggregateRootsStrategy` so only ready aggregates match.

**Related docs:** [Decorators](/api-reference/decorators/), [Snapshot policies](/capabilities/snapshot-policies/), and [Exceptions](/api-reference/exceptions/).

<h3 id="snapshot-strategy-constructor">Invalid snapshot strategy construction</h3>

**Symptom:** Startup reports that count may not be less than 1 or that a composite strategy requires at least one strategy.

**Likely cause:** `ForCountSnapshotStrategy` received `count < 1`, or `AllOfSnapshotStrategy`/`AnyOfSnapshotStrategy` received an empty array.

**How to confirm:** Inspect the values used to construct the strategy, especially environment-derived counts and conditionally assembled arrays.

**Resolution:** Use a positive count and at least one child strategy. Use `NoSnapshotStrategy` or omit the adapter snapshot pair when snapshots should be disabled.

**Related docs:** [Public API](/api-reference/public-api/) and [Configuration](/api-reference/configuration/).

<h3 id="snapshot-revision-mismatch">Snapshot revision mismatch</h3>

**Symptom:** Direct `findWithSnapshot()` throws `SnapshotRevisionMismatchException` after a deployment.

**Likely cause:** The aggregate's configured revision differs from the latest stored snapshot revision.

**How to confirm:** Compare `@AggregateRootConfig({ snapshotRevision })` with the snapshot row/document revision. Also check whether mixed application versions are active.

**Resolution:** Fall back to `findByAggregateRootId()` and full replay, then allow a new snapshot to be produced. `AggregateRepository.load()` already catches this one exception and performs the full replay; other snapshot errors are rethrown.

**Related docs:** [Exceptions](/api-reference/exceptions/) and [Snapshot loading](/how-event-nest-works/snapshot-loading/).

<h3 id="snapshot-load-version-zero">Snapshot load resumes at version 0</h3>

**Symptom:** An aggregate loaded from a snapshot with no later events has correct state but its next commit conflicts, often expecting version 0.

**Likely cause:** The factory ignored `aggregateRootVersion` returned by `findWithSnapshot()`. With no replayed events, `reconstitute()` cannot infer the snapshot's stream version from the event array.

**How to confirm:** Log the read result and aggregate version immediately after factory construction. The built-in adapters return the snapshot version when the post-snapshot event list is empty.

**Resolution:** Define the factory as `(id, events, snapshot, aggregateRootVersion)` and call `root.reconstitute(events, snapshot, aggregateRootVersion)`, or use `AggregateRepository` with a factory that forwards all arguments.

**Related docs:** [Public API](/api-reference/public-api/) and [Snapshot loading](/how-event-nest-works/snapshot-loading/).

## Subscriptions

<h3 id="subscriptions-not-discovered">Handlers are not discovered</h3>

**Symptom:** Event Nest logs that no subscriptions were discovered, or a particular event cannot be passed to subscriptions.

**Likely cause:** The handler is not a Nest provider, lacks `@DomainEventSubscription`, lacks a callable `onDomainEvent`, or the application has not completed bootstrap.

**How to confirm:** Confirm the class appears in a module's `providers`, has both decorator and method, and the application was initialized. Binding scans instantiated providers during adapter `onApplicationBootstrap`.

**Resolution:** Register the decorated handler as a provider and implement `OnDomainEvent<T>`. Ensure the adapter module is imported once in the relevant/global scope and allow application bootstrap to finish before committing.

**Related docs:** [Decorators](/api-reference/decorators/) and [Configuration](/api-reference/configuration/).

<h3 id="async-subscription-failure">Asynchronous failure does not reject <code>commit()</code></h3>

**Symptom:** A handler logs an error, but `commit()` has already resolved.

**Likely cause:** `isAsync` defaults to `true`, so asynchronous subscriptions normally do not delay commits. With `concurrentSubscriptions: true`, their failures are logged and swallowed by the detached dispatch path.

**How to confirm:** Inspect the decorator configuration and module's `concurrentSubscriptions`. Remember that `isAsync` describes whether commit waits, not whether `onDomainEvent` returns a promise (it always must).

**Resolution:** Use `@DomainEventSubscription({ eventClasses: [...], isAsync: false })` when the caller must observe handler failure. Make side effects idempotent and monitor asynchronous failures when eventual consistency is intended.

**Related docs:** [Decorators](/api-reference/decorators/) and [Exceptions](/api-reference/exceptions/).

<h3 id="subscription-exception-after-persistence"><code>SubscriptionException</code> after persistence</h3>

**Symptom:** An awaited subscription fails and the caller assumes the event transaction rolled back.

**Likely cause:** Event Nest persists events, resolves versions, and creates any snapshot before dispatching subscriptions.

**How to confirm:** Use `eventId` from the exception to inspect persisted events. The exception also exposes `caughtError` and `eventClassName`.

**Resolution:** Do not append or commit the same domain event again. Repair/retry the projection or side effect idempotently. Event Nest clears the aggregate's uncommitted events for `SubscriptionException` specifically.

**Related docs:** [Exceptions](/api-reference/exceptions/) and [Failure behaviour](/how-event-nest-works/failure-behaviour/).

## Storage adapters

<h3 id="sql-table-creation">SQL tables are not created</h3>

**Symptom:** Tables remain absent, or bootstrap logs a DDL/permission failure.

**Likely cause:** `ensureTablesExist` defaults to `false`, the configured schema does not exist, the database user lacks DDL rights, or names point at another schema.

**How to confirm:** Check the resolved async options and database permissions. PostgreSQL logs table-initialization errors and continues; SQL Server logs and rethrows them, so startup fails.

**Resolution:** Create the schema first and grant appropriate rights, set `ensureTablesExist: true`, or create the documented tables manually and leave the option false. Initialization creates missing tables; it is not a migration engine for existing tables.

**Related docs:** [Configuration](/api-reference/configuration/) and [Storage model](/storage/storage-model/).

<h3 id="mongodb-transactions">MongoDB transaction failure</h3>

**Symptom:** Save or purge fails with a message that transactions are unsupported or require a replica set.

**Likely cause:** The MongoDB adapter runs both operations in a session transaction, but the server is standalone or the deployment/URI does not support transactions.

**How to confirm:** Inspect the MongoDB topology and run the driver's transaction capability checks. A successful connection alone does not prove transaction support.

**Resolution:** Use a replica set or supported sharded deployment and a URI that selects it. Do not work around the error by bypassing Event Nest's transaction, because aggregate version and event atomicity depend on it.

**Related docs:** [MongoDB configuration](/api-reference/configuration/) and [Compatibility](/help/compatibility/).

<h3 id="mongodb-aggregate-id">MongoDB rejects an aggregate ID</h3>

**Symptom:** Reads, saves, or purges fail while constructing a MongoDB `ObjectId`.

**Likely cause:** The MongoDB adapter expects aggregate IDs accepted by `new ObjectId(id)`, but application code supplied another ID format.

**How to confirm:** Check that the ID is a 24-character hexadecimal `ObjectId` string. A UUID, including one returned by `randomUUID()`, is not accepted by this adapter.

**Resolution:** Create aggregate IDs in application code with the MongoDB driver's `new ObjectId().toHexString()`, and validate externally supplied IDs before store calls.

**Related docs:** [Public API](/api-reference/public-api/) and [MongoDB configuration](/api-reference/configuration/).

<h3 id="postgresql-ssl">PostgreSQL SSL failure</h3>

**Symptom:** TLS negotiation or certificate validation fails after setting `ssl`.

**Likely cause:** The CA text is incorrect, `rejectUnauthorized` does not match the deployment, or SSL was configured both in the URI and explicit options inconsistently.

**How to confirm:** Inspect the exact resolved `SslOptions`. Event Nest maps `certificate` to `ssl.ca` and forwards the required `rejectUnauthorized`; when `ssl` is omitted it does not add an SSL object.

**Resolution:** Supply the correct CA certificate string and validation policy for the server, or omit explicit `ssl` when URI/driver defaults should control transport.

**Related docs:** [PostgreSQL configuration](/api-reference/configuration/) and [Compatibility](/help/compatibility/).

<h3 id="sql-server-configuration">SQL Server configuration rejection</h3>

**Symptom:** Startup rejects identifiers, or reports that `port` and `instanceName` cannot both be provided.

**Likely cause:** A schema/table field is blank, over 128 characters, contains a dot, or the connection tries to select a named instance and explicit port simultaneously.

**How to confirm:** Validate `schemaName`, all table names, and `connection`. Event Nest expects schema and table as separate values and defaults `encrypt` to `true`, `trustServerCertificate` to `false`, and pool `min` to `0`.

**Resolution:** Remove schema prefixes from table fields, use legal SQL Server identifiers, and choose either `port` or `instanceName`. Configure TLS explicitly rather than disabling validation without understanding the risk.

**Related docs:** [SQL Server configuration](/api-reference/configuration/) and [Compatibility](/help/compatibility/).
