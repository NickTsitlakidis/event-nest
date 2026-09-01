---
title: Subscription Dispatch
description: The sequential, concurrent, blocking, and detached subscription modes used after events are persisted.
---

Subscriptions receive `PublishedDomainEvent` objects only after adapter persistence, committed-version resolution, optional snapshot creation, and event-version mapping. They are in-process reactions, not part of the event-storage transaction.

Two independent settings control dispatch:

| Setting | Values | Controls |
| --- | --- | --- |
| Module `concurrentSubscriptions` | `false` by default, or `true` | Whether different committed events are dispatched in event order or concurrently. |
| `@DomainEventSubscription` `isAsync` | `true` by default, or `false` | Whether that subscription is normally detached or blocks `commit()`. |

Despite the internal names "async" and "sync," every `onDomainEvent()` returns a promise. `isAsync: false` means blocking, not necessarily synchronous JavaScript.

## Discovery and matching

At module startup, `DomainEventEmitter` scans Nest providers for `@DomainEventSubscription` metadata and an `onDomainEvent` function. It registers each provider separately in the detached or blocking handler map for every configured event class.

At dispatch, matching uses event-class subscription metadata on the published payload's constructor. Sequential mode warns when an event has no handler; concurrent mode silently filters it out. Multiple handlers registered for the same event are invoked concurrently.

## Default sequential mode

With `concurrentSubscriptions: false`, events are processed in the order passed by the commit pipeline. For each event, all matching handlers run together with `Promise.all`; the next event starts after that group settles.

The waiting rule applies to the entire committed batch:

- If no event in the batch has a blocking subscription, dispatch is started as a detached sequential stream and `emitMultiple()` resolves immediately.
- If any event in the batch has a blocking subscription, Event Nest awaits the complete sequential stream. All matching handlers in that batch are awaited, including subscriptions declared with the default `isAsync: true`.

That second rule is easy to miss: adding one blocking subscription to one event changes the whole sequential batch from detached to awaited. A rejected handler in that awaited batch is wrapped in `SubscriptionException`, and later event groups are not started.

## Concurrent mode

With `concurrentSubscriptions: true`, event ordering is not preserved across handlers:

- All default `isAsync: true` handlers for all matching events are started together and detached. Their completion does not delay `commit()`.
- All `isAsync: false` handlers for all matching events are started together and awaited with `Promise.all`.
- A batch containing blocking handlers does not cause detached handlers to become awaited in concurrent mode.

This mode can improve throughput when projections and reactions do not depend on commit-batch event order. It should not be enabled for handlers that require event-by-event sequencing.

## Failures

An awaited handler rejection is logged, wrapped in `SubscriptionException`, and returned through `commit()`. Event persistence and aggregate version resolution have already succeeded. `AggregateRoot.commit()` clears the uncommitted events before rethrowing this specific exception, preventing the same events from being committed again.

A detached handler rejection is logged but is not returned through the already successful `commit()`. At that point the events are persisted, the aggregate version is committed, and the uncommitted buffer has been cleared. In default sequential mode, that rejection also stops later event groups in the detached batch. Event Nest does not retry a failed subscription automatically.

When several awaited concurrent handlers fail, `Promise.all` rejects with the first rejection it observes. Other handlers may already be running and are not cancelled.

See [Commit Pipeline](/how-event-nest-works/commit-pipeline/) for the metadata delivered to handlers and [Failure Behaviour](/how-event-nest-works/failure-behaviour/) for the complete state matrix.
