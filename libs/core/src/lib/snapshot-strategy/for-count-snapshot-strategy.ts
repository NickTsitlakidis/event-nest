import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { SnapshotStrategy } from "./snapshot-strategy";

export interface ForCountSnapshotStrategyConfig {
    count: number;
}

/**
 * A snapshot strategy that creates snapshots based on the number of events processed.
 * A snapshot will be created when the aggregate root has processed at least the specified
 * number of events since the last snapshot.
 *
 * If you append more than `count` events in a single batch (before calling commit), only one
 * snapshot will be created for the entire batch, not multiple snapshots. This ensures that
 * even if you append many events at once, you get a single snapshot representing the state
 * after all those events are applied.
 *
 * @example
 * ```typescript
 * // Create a snapshot after at least 10 events
 * new ForCountSnapshotStrategy({ count: 10 })
 * ```
 *
 * @throws {Error} If count is less than 1
 */
export class ForCountSnapshotStrategy extends SnapshotStrategy {
    constructor(private readonly config: ForCountSnapshotStrategyConfig) {
        super();
        if (config.count < 1) {
            throw new Error("PerCountSnapshotStrategy: config.count may not be less than 1");
        }
    }

    shouldCreateSnapshot(aggregateRoot: AggregateRoot) {
        const currentVersion = aggregateRoot.version;
        const newEventsCount = aggregateRoot.uncommittedEvents.length;
        const projectedVersion = currentVersion + newEventsCount;

        const currentBlock = Math.floor(currentVersion / this.config.count);
        const projectedBlock = Math.floor(projectedVersion / this.config.count);

        return projectedBlock - currentBlock > 0;
    }
}
