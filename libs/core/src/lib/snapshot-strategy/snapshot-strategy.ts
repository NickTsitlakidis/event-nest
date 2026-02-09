import type { AggregateRoot } from "../aggregate-root/aggregate-root";

/**
 * Abstract base class for snapshot strategies. Snapshot strategies determine when snapshots
 * should be created for aggregate roots.
 *
 * You can extend this class to create custom snapshot strategies that implement your own
 * logic for determining when snapshots should be created. The built-in strategies include:
 * - {@link NoSnapshotStrategy} - Never creates snapshots (default)
 * - {@link ForCountSnapshotStrategy} - Creates snapshots based on event count
 * - {@link ForAggregateRootsStrategy} - Creates snapshots for specific aggregate types
 * - {@link ForEventsSnapshotStrategy} - Creates snapshots when specific events occur
 * - {@link AllOfSnapshotStrategy} - Combines multiple strategies with AND logic
 * - {@link AnyOfSnapshotStrategy} - Combines multiple strategies with OR logic
 */
export abstract class SnapshotStrategy {
    /**
     * Determines whether a snapshot should be created for the given aggregate root.
     * This method is called before committing events to decide if a snapshot should be
     * created at that point.
     *
     * @param aggregateRoot The aggregate root to evaluate
     * @returns true if a snapshot should be created, false otherwise. Can return a Promise
     *          for asynchronous evaluation.
     */
    abstract shouldCreateSnapshot(aggregateRoot: AggregateRoot): boolean | Promise<boolean>;
}
