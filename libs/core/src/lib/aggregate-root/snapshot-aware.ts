import { isFunction } from "es-toolkit";

import type { SnapshotAwareAggregateRoot } from "../storage/event-store";

import { AggregateClassNotSnapshotAwareException } from "../exceptions/aggregate-class-not-snapshot-aware-exception";
import { AggregateInstanceNotSnapshotAwareException } from "../exceptions/aggregate-instance-not-snapshot-aware-exception";
import { MissingAggregateRootNameException } from "../exceptions/missing-aggregate-root-name-exception";
import { AggregateRoot } from "./aggregate-root";
import { getAggregateRootName, getAggregateRootSnapshotRevision } from "./aggregate-root-config";

/**
 * Interface that defines methods that should be implemented by an aggregate root to support snapshots.
 * Snapshots allow for faster reconstitution of aggregate roots by storing their current state
 * at specific points in time, rather than replaying all events from the beginning.
 *
 * @template Snapshot The type of the snapshot data structure
 */
export interface SnapshotAware<Snapshot = unknown> {
    /**
     * Applies a snapshot to restore the aggregate root's state from a previously saved snapshot.
     * @param snapshot The snapshot data to apply
     */
    applySnapshot(snapshot: Snapshot): void;
    /**
     * Should return a snapshot of the current state of the aggregate root.
     * @returns The snapshot data representing the current state of the aggregate root.
     */
    toSnapshot(): Promise<Snapshot> | Snapshot;
}

/**
 * Type guard that checks if an aggregate root instance implements the SnapshotAware interface.
 *
 * @param aggregate The aggregate root instance to check
 * @returns true if the aggregate root instance implements SnapshotAware, false otherwise
 */
export const isAggregateInstanceSnapshotAware = (
    aggregate: AggregateRoot
): aggregate is AggregateRoot & SnapshotAware =>
    "toSnapshot" in aggregate &&
    isFunction(aggregate.toSnapshot) &&
    "applySnapshot" in aggregate &&
    isFunction(aggregate.applySnapshot);

/**
 * Checks if an aggregate root class supports snapshots by validating
 * aggregateRootSnapshotRevision metadata value.
 *
 * @see {@link AggregateRootConfig} for metadata attachment details
 * @param aggregateRoot The aggregate root instance to check
 * @returns true if the aggregate root's class has correct numeric `snapshotRevision` attached, false otherwise
 */
export const isAggregateClassSnapshotAware = (aggregateRoot: AggregateRoot): boolean =>
    typeof getAggregateRootSnapshotRevision(aggregateRoot.constructor) === "number";

/**
 * Asserts that the given aggregate root instance implements the SnapshotAware interface.
 * Throws an error if the instance does not implement the interface.
 *
 * @param aggregateRoot The aggregate root instance to check
 * @throws {AggregateInstanceNotSnapshotAwareException} if the instance does not implement SnapshotAware
 * @throws {AggregateClassNotSnapshotAwareException} if the class does not have a valid snapshot revision
 * @throws {MissingAggregateRootNameException} if the aggregate root name is missing
 */
export function assertIsSnapshotAwareAggregateRoot(
    aggregateRoot: AggregateRoot
): asserts aggregateRoot is SnapshotAwareAggregateRoot {
    const aggregateRootName = getAggregateRootName(aggregateRoot.constructor);

    if (!aggregateRootName) {
        throw new MissingAggregateRootNameException(aggregateRoot.constructor.name);
    }

    if (!isAggregateInstanceSnapshotAware(aggregateRoot)) {
        throw new AggregateInstanceNotSnapshotAwareException(aggregateRoot.constructor.name);
    }

    if (!isAggregateClassSnapshotAware(aggregateRoot)) {
        throw new AggregateClassNotSnapshotAwareException(aggregateRoot.constructor.name);
    }
}
