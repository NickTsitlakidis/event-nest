import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { SnapshotStrategy } from "./snapshot-strategy";

/**
 * A composite snapshot strategy that creates a snapshot when at least ONE underlying strategy
 * returns true. This implements an OR logic - any condition can be satisfied.
 *
 * This strategy is useful when you want to create snapshots under multiple different conditions.
 * For example, you might want to create snapshots either when a specific event occurs OR when
 * certain aggregate types reach a certain event count.
 *
 * @example
 * ```typescript
 * new AnyOfSnapshotStrategy([
 *     new AllOfSnapshotStrategy([
 *         new ForAggregateRootsStrategy({ aggregates: [User] }),
 *         new ForCountSnapshotStrategy({ count: 10 })
 *     ]),
 *     new ForEventsSnapshotStrategy({ eventClasses: [UserIdentityChangedEvent] })
 * ])
 * ```
 *
 * In this example, a snapshot will be created if any of the following conditions are met:
 * - The aggregate root is of type User AND at least 10 events have been processed since the last snapshot, OR
 * - A UserIdentityChangedEvent event is present
 */
export class AnyOfSnapshotStrategy extends SnapshotStrategy {
    constructor(private readonly strategies: SnapshotStrategy[]) {
        super();
        if (strategies.length === 0) {
            throw new Error("AnyOfSnapshotStrategy requires at least one strategy");
        }
    }

    shouldCreateSnapshot(aggregateRoot: AggregateRoot): boolean {
        return this.strategies.some((strategy) => strategy.shouldCreateSnapshot(aggregateRoot));
    }
}
