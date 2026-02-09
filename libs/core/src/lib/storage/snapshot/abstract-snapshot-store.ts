import { AggregateRoot } from "../../aggregate-root/aggregate-root";
import { getAggregateRootSnapshotRevision } from "../../aggregate-root/aggregate-root-config";
import { assertIsSnapshotAwareAggregateRoot } from "../../aggregate-root/snapshot-aware";
import { SnapshotStrategy } from "../../snapshot-strategy/snapshot-strategy";
import { SnapshotAwareAggregateRoot } from "../event-store";
import { SnapshotStore } from "./snapshot-store";
import { StoredSnapshot } from "./stored-snapshot";

export abstract class AbstractSnapshotStore implements SnapshotStore {
    constructor(private readonly snapshotStrategy: SnapshotStrategy) {}

    async create(aggregateRoot: SnapshotAwareAggregateRoot): Promise<StoredSnapshot | undefined> {
        const snapshotRevision = getAggregateRootSnapshotRevision(aggregateRoot.constructor);

        const snapshot = StoredSnapshot.create(
            await this.generateEntityId(),
            aggregateRoot.version,
            snapshotRevision,
            await aggregateRoot.toSnapshot(),
            aggregateRoot.id
        );

        const saved = await this.save(snapshot);

        return saved;
    }

    abstract findLatestSnapshotByAggregateId(id: string): Promise<StoredSnapshot | undefined>;

    abstract generateEntityId(): Promise<string>;
    abstract save(snapshot: StoredSnapshot): Promise<StoredSnapshot | undefined>;

    shouldCreateSnapshot(aggregateRoot: AggregateRoot): aggregateRoot is SnapshotAwareAggregateRoot {
        if (!this.snapshotStrategy.shouldCreateSnapshot(aggregateRoot)) {
            return false;
        }

        assertIsSnapshotAwareAggregateRoot(aggregateRoot);

        return true;
    }
}
