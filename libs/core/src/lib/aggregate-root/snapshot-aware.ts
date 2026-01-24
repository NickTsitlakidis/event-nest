import { isFunction } from "es-toolkit";

import { AggregateRootClass, SnapshotAwareAggregateClass } from "../storage/event-store";
import { AggregateRoot } from "./aggregate-root";

/**
 * Interface that defines methods that should be implemented by aggregate roots to support snapshots.
 * Snapshots allow for faster reconstitution of aggregate roots by storing their current state
 * at specific points in time, rather than replaying all events from the beginning.
 *
 * @template Snapshot The type of the snapshot data structure
 */
export interface SnapshotAware<Snapshot = unknown> {
    /**
     * Optional. Applies a snapshot to restore the aggregate root's state from a previously saved snapshot.
     * @param snapshot The snapshot data to apply
     */
    applySnapshot?(snapshot: Snapshot): void;
    /**
     * Should return a snapshot of the current state of the aggregate root.
     * @returns The snapshot data representing the current state of the aggregate root.
     */
    toSnapshot(): Promise<Snapshot> | Snapshot;
}

/**
 * Type guard that checks if an aggregate root instance implements the SnapshotAware interface.
 * If so, it should have a toSnapshot method defined. applySnapshot is optional.
 *
 * @param aggregate The aggregate root instance to check
 * @returns true if the aggregate root instance implements SnapshotAware, false otherwise
 */
export const isAggregateInstanceSnapshotAware = (
    aggregate: AggregateRoot
): aggregate is AggregateRoot & SnapshotAware => isFunction(aggregate.toSnapshot);

/**
 * Type guard that checks if an aggregate root class supports snapshots by verifying
 * the presence of the `snapshotRevision` static property
 *
 * @param aggregateClass The aggregate root class to check
 * @returns true if the aggregate root class has the `snapshotRevision` static property, false otherwise
 */
export const isAggregateClassSnapshotAware = (
    aggregateClass: AggregateRootClass<unknown>
): aggregateClass is SnapshotAwareAggregateClass =>
    "snapshotRevision" in aggregateClass && typeof aggregateClass.snapshotRevision === "number";
