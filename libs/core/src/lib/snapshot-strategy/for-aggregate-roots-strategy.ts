import { Logger } from "@nestjs/common";
import { isNil } from "es-toolkit";

import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { getAggregateRootName } from "../aggregate-root/aggregate-root-config";
import { AggregateRootClass } from "../storage/event-store";
import { SnapshotStrategy } from "./snapshot-strategy";

export interface ForAggregateRootsStrategyConfig {
    aggregates: AggregateRootClass<unknown>[];
}

/**
 * A snapshot strategy that creates snapshots only for a specific list of aggregate root types.
 * This strategy is useful when you want to enable snapshotting for certain aggregates while
 * excluding others.
 * It is meant to be used alongside with the {@link AllOfSnapshotStrategy} to filter out snapshot creation for specific aggregate root types.
 *
 * @example
 * ```typescript
 * // Create snapshots only for User aggregates
 * new ForAggregateRootsStrategy({ aggregates: [User] })
 * ```
 *
 * @example
 * ```typescript
 * // Create snapshots for multiple aggregate types
 * new ForAggregateRootsStrategy({ aggregates: [User, Order, Product] })
 * ```
 */
export class ForAggregateRootsStrategy extends SnapshotStrategy {
    private aggregateRootNames: string[];
    private logger: Logger;

    constructor(config: ForAggregateRootsStrategyConfig) {
        super();
        this.logger = new Logger(ForAggregateRootsStrategy.name);
        this.aggregateRootNames = config.aggregates
            .map((aggregateRootClass) => {
                const aggregateRootName = getAggregateRootName(aggregateRootClass);
                if (isNil(aggregateRootName)) {
                    this.logger.error(
                        `Missing aggregate root name for class: ${aggregateRootClass.name}. Use the @AggregateRootName decorator.`
                    );

                    return;
                }

                return aggregateRootName;
            })
            .filter((name) => typeof name === "string");
    }

    override shouldCreateSnapshot(aggregateRoot: AggregateRoot) {
        const aggregateRootName = getAggregateRootName(aggregateRoot.constructor);
        if (!aggregateRootName) {
            this.logger.error(
                `Missing aggregate root name for class: ${aggregateRoot.constructor}. Use the @AggregateRootName decorator.`
            );

            return false;
        }

        return this.aggregateRootNames.includes(aggregateRootName);
    }
}
