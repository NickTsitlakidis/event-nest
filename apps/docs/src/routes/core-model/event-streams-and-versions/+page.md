---
title: Event Streams and Versions
description: Learn how Event Nest orders aggregate history and detects concurrent writes.
---

Each aggregate instance has an event stream: the ordered sequence of events recorded for that aggregate ID and aggregate name. For a `User`, the stream might be:

| Version | Event name | Meaning |
| ---: | --- | --- |
| 1 | `user-created` | The user began to exist with a name and email. |
| 2 | `user-name-changed` | The user selected a new name. |
| 3 | `user-name-changed` | The user selected another name. |

Event IDs identify individual rows. The aggregate ID identifies the stream. The aggregate root name distinguishes the model whose history should be loaded.

## Version lifecycle

A new `AggregateRoot` starts at version 0. Appending events does not change that version because no durable write has happened. During commit, the store assigns consecutive versions and updates the aggregate:

```text
loaded version:        4
uncommitted events:    2
assigned versions:     5, 6
version after commit:  6
```

When a stream is loaded without a snapshot, `reconstitute()` sorts events by version and sets the aggregate to the highest replayed version. For snapshot-aware loads, the repository passes the store's authoritative `aggregateRootVersion`, including when no events exist after the latest snapshot.

## Optimistic concurrency

The aggregate's current version is also the expected storage version. A PostgreSQL commit locks the aggregate row in a transaction and compares that expected value with the stored value. If they differ, the transaction throws `EventConcurrencyException` and stores none of that commit's events.

For example, two requests load version 6:

1. Request A commits one event. Storage advances to version 7.
2. Request B still expects version 6.
3. Request B's commit fails instead of silently overwriting or interleaving a decision made from stale state.

Load the aggregate again and reconsider the command against current state. Do not merely mutate the stale instance's version or bypass the check.
