import { NoSnapshotStrategy } from "../../snapshot-strategy/no-snapshot-strategy";
import { AbstractSnapshotStore } from "./abstract-snapshot-store";

/**
 * This is a no-operation implementation of the snapshot store. It effectively disables snapshot functionality
 * by providing methods that do not perform any actions or return any meaningful data.
 */
export class NoOpSnapshotStore extends AbstractSnapshotStore {
    constructor() {
        super(new NoSnapshotStrategy());
    }

    override findLatestSnapshotByAggregateId() {
        return Promise.resolve(void 0);
    }

    override generateEntityId(): Promise<string> {
        return Promise.resolve("");
    }

    override save() {
        return Promise.resolve(void 0);
    }
}
