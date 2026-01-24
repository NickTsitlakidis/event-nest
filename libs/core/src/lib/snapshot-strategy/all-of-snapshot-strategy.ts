import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { SnapshotStrategy } from "./snapshot-strategy";

/**
 * A composite snapshot strategy that creates a snapshot only when ALL underlying strategies
 * return true. This implements an AND logic - all conditions must be satisfied.
 *
 * This strategy is useful when you need to combine multiple conditions. For example, you might
 * want to create snapshots only for specific aggregate types AND only after a certain number
 * of events have been processed.
 *
 * @example
 * ```typescript
 * new AllOfSnapshotStrategy([
 *     new ForAggregateRootsStrategy({ aggregates: [User] }),
 *     new ForCountSnapshotStrategy({ count: 10 })
 * ])
 * ```
 *
 * In this example, a snapshot will be created only if:
 * - The aggregate root is of type User, AND
 * - At least 10 events have been processed since the last snapshot
 *
 * If any of the underlying strategies returns false, no snapshot will be created.
 */
export class AllOfSnapshotStrategy extends SnapshotStrategy {
    constructor(private readonly strategies: SnapshotStrategy[]) {
        super();
        if (strategies.length === 0) {
            throw new Error("AllOfSnapshotStrategy requires at least one strategy");
        }
    }

    shouldCreateSnapshot(aggregateRoot: AggregateRoot): boolean {
        return this.strategies.every((strategy) => strategy.shouldCreateSnapshot(aggregateRoot));
    }
}
