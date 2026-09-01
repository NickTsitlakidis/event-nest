---
title: Failure Behaviour
description: What is persisted, versioned, cleared, retained, surfaced, or logged when each commit stage fails.
---

A rejected `commit()` does not always mean that persistence failed. The failure's pipeline stage determines whether the event stream was written and whether the aggregate retains its uncommitted buffer.

## State matrix

| Failure point | Events persisted? | In-memory aggregate version | Uncommitted events | Caller observes |
| --- | --- | --- | --- | --- |
| Snapshot policy rejects or throws | No | Unchanged | Retained | The original policy or snapshot-awareness error |
| Adapter persistence rejects | No in the official adapters | Unchanged by core | Retained | The adapter error, commonly `EventConcurrencyException` |
| Snapshot creation fails after `save` | Yes | Updated to the committed version | Retained | Snapshot ID, `toSnapshot()`, or snapshot-store error |
| Awaited subscription fails | Yes | Updated to the committed version | Cleared | `SubscriptionException` |
| Detached async subscription fails | Yes | Updated by the successful commit | Cleared by the successful commit | Logged; not surfaced to the caller |

The persistence row describes the official MongoDB, PostgreSQL, and SQL Server adapters, which wrap their event inserts and aggregate version update in an adapter transaction. The core `EventStore` interface cannot enforce atomicity in a custom adapter, so custom implementations must define and test their own failure semantics.

Snapshot creation is a separate, later storage operation. It is not included in the official adapters' event-save transaction. Subscription work begins later still and never rolls event persistence back.

## Before persistence

Failures while resolving aggregate metadata, generating event IDs, or evaluating the snapshot policy occur before `save()`. The table calls out policy rejection because asynchronous policies are explicitly awaited, but the same no-persistence and retain-buffer behavior applies to the earlier metadata and ID stages.

When an official adapter rejects its event-save transaction, core has not yet called `aggregate.resolveVersion()`. The aggregate keeps its prior in-memory version and `AggregateRoot.commit()` retains the copied events because the error is not a `SubscriptionException`.

## After persistence

Once `save()` resolves, core immediately updates the aggregate version. The following operations can still fail:

- Snapshot creation can fail while generating its ID, awaiting `toSnapshot()`, or saving the snapshot.
- A custom or faulty adapter response can omit a saved event, causing `UnknownEventVersionException` during published-version mapping.
- An awaited subscription can reject, causing `SubscriptionException`.

Only `SubscriptionException` causes `AggregateRoot.commit()` to clear events on an error path. Other post-persistence errors retain the buffer even though the stream may already contain those events.

## Retry safety

Do not blindly retry a commit after a post-persistence, non-subscription failure. For example, after snapshot creation fails, the events are already stored and the aggregate version is already advanced, but the same events remain uncommitted in memory. Calling `commit()` again can persist duplicate logical events at new versions.

Instead, treat the persisted stream as authoritative: discard or reload the aggregate, inspect or repair the failed snapshot operation, and decide explicitly whether downstream work needs compensation. `SubscriptionException` is different because Event Nest clears the committed events before rethrowing; retrying the domain command may still duplicate business intent, but it will not republish that aggregate instance's old buffer.

Detached subscription failures cannot be recovered by awaiting the original commit. They are logged after dispatch and require application-level monitoring, idempotency, or retry infrastructure if delivery is important.

See [Subscription Dispatch](/how-event-nest-works/subscription-dispatch/) for which handlers are awaited, and [Commit Pipeline](/how-event-nest-works/commit-pipeline/) for the stage ordering behind this matrix.
