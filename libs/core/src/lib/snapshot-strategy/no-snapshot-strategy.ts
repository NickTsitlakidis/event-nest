import { SnapshotStrategy } from "./snapshot-strategy";

/**
 * The default snapshot strategy used by the event-nest module when no snapshot strategy
 * is explicitly configured. This strategy never creates snapshots, regardless of the
 * aggregate root's state or events.
 *
 * If you want to enable snapshot creation, you should choose one of the other available
 * snapshot strategies or build your own.
 * Built-in strategies:
 * - {@link ForCountSnapshotStrategy} - Create snapshots based on event count
 * - {@link ForAggregateRootsStrategy} - Create snapshots for specific aggregate types
 * - {@link ForEventsSnapshotStrategy} - Create snapshots when specific events occur
 * - {@link AllOfSnapshotStrategy} - Combine multiple strategies with AND logic
 * - {@link AnyOfSnapshotStrategy} - Combine multiple strategies with OR logic
 */
export class NoSnapshotStrategy extends SnapshotStrategy {
    shouldCreateSnapshot() {
        return false;
    }
}
