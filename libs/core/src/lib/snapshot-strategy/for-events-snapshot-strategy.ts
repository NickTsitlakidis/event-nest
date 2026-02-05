import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { Class } from "../utils/type-utils";
import { SnapshotStrategy } from "./snapshot-strategy";

export interface ForEventsSnapshotStrategyConfig {
    eventClasses: Class<unknown>[];
}

/**
 * A snapshot strategy that creates snapshots when specific event types are present in the
 * aggregate root's uncommitted events.
 *
 * This is useful when you want to create snapshots for specific important events, such as
 * events that significantly change the aggregate's state or events that are expensive to
 * replay.
 *
 * @example
 * ```typescript
 * // Create a snapshot whenever a UserIdentityChangedEvent is present
 * new ForEventsSnapshotStrategy({ eventClasses: [UserIdentityChangedEvent] })
 * ```
 *
 * @example
 * ```typescript
 * // Create a snapshot for multiple event types
 * new ForEventsSnapshotStrategy({
 *     eventClasses: [UserIdentityChangedEvent, UserOrderUpdatedEvent]
 * })
 * ```
 */
export class ForEventsSnapshotStrategy extends SnapshotStrategy {
    constructor(private readonly config: ForEventsSnapshotStrategyConfig) {
        super();
    }

    shouldCreateSnapshot(aggregateRoot: AggregateRoot) {
        return aggregateRoot.uncommittedEvents.some((event_) =>
            this.config.eventClasses.some((class_) => event_.payload instanceof class_)
        );
    }
}
