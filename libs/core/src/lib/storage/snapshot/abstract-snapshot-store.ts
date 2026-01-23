import { Logger } from "@nestjs/common";

import { AggregateRoot } from "../../aggregate-root/aggregate-root";
import { getAggregateRootName } from "../../aggregate-root/aggregate-root-name";
import { isAggregateClassSnapshotAware, isAggregateInstanceSnapshotAware } from "../../aggregate-root/snapshot-aware";
import { SnapshotStrategy } from "../../snapshot-strategy/snapshot-strategy";
import { SnapshotStore } from "./snapshot-store";
import { StoredSnapshot } from "./stored-snapshot";

export const SNAPSHOT_STORE = Symbol("EVENT_NEST_SNAPSHOT_STORE");

export abstract class AbstractSnapshotStore implements SnapshotStore {
    private logger: Logger;
    constructor(private readonly snapshotStrategy: SnapshotStrategy) {
        this.logger = new Logger("SnapshotStore");
    }

    abstract findLatestSnapshotByAggregateId(id: string): Promise<StoredSnapshot | undefined>;
    abstract generateEntityId(): Promise<string>;

    async maybeCreate(aggregateRoot: AggregateRoot): Promise<boolean> {
        const aggregateRootClass = aggregateRoot.constructor;
        const name = getAggregateRootName(aggregateRootClass);
        const shouldCreateSnapshot = await this.snapshotStrategy.shouldCreateSnapshot(aggregateRoot);

        if (!shouldCreateSnapshot) {
            this.logger.debug(`Snapshot strategy did not match for aggregate root: ${name}`);

            return false;
        }

        const isInstanceSnapshotAware = isAggregateInstanceSnapshotAware(aggregateRoot);
        const isClassSnapshotAware = isAggregateClassSnapshotAware(aggregateRootClass);

        const errors: string[] = [];

        if (!isInstanceSnapshotAware) {
            errors.push("Missing applySnapshot() or toSnapshot() methods");
        }

        if (!isClassSnapshotAware) {
            errors.push("Missing static property snapshotRevision on aggregate root class");
        }

        if (!isInstanceSnapshotAware || !isClassSnapshotAware) {
            this.logger.error(
                `Aggregate root ${name} incorrectly implements the SnapshotAware interface: ${errors.join("; ")}`
            );

            return false;
        }

        const snapshot = StoredSnapshot.create(
            await this.generateEntityId(),
            aggregateRoot.version,
            aggregateRootClass.snapshotRevision,
            await aggregateRoot.toSnapshot(),
            aggregateRoot.id
        );

        const saved = await this.save(snapshot);

        return !!saved;
    }

    abstract save(snapshot: StoredSnapshot): Promise<StoredSnapshot | undefined>;
}
