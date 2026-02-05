import { AggregateRoot } from "../../aggregate-root/aggregate-root";
import { SnapshotAwareAggregateRoot } from "../event-store";
import { StoredSnapshot } from "./stored-snapshot";

export const SNAPSHOT_STORE = Symbol("EVENT_NEST_SNAPSHOT_STORE");

export interface SnapshotStore {
    /**
     * Creates a snapshot for the given aggregate root
     * Accepts a SnapshotAwareAggregateRoot, meaning the snapshot-awareness check should already be done.
     * @param aggregateRoot The aggregate root instance to create a snapshot for
     * @returns Promise that resolves to the saved snapshot, or undefined if the save operation did not complete
     */
    create(aggregateRoot: SnapshotAwareAggregateRoot): Promise<StoredSnapshot | undefined>;
    /**
     * Finds the most recent snapshot for a given aggregate root by its ID.
     * @param id The unique identifier of the aggregate root
     * @returns Promise that resolves to the latest stored snapshot, or undefined if no snapshot exists
     */
    findLatestSnapshotByAggregateId(id: string): Promise<StoredSnapshot | undefined>;
    /**
     * Each storage solution has its own way of dealing with unique ids. This method's implementation should reflect
     * the way the storage solution generates unique ids. For example, in a MongoDB database this would usually return
     * a String representation of a MongoDB ObjectId.
     */
    generateEntityId(): Promise<string>;
    /**
     * Saves a snapshot to the storage
     * @param snapshot The snapshot to be saved
     * @returns Promise that resolves to the saved snapshot, or undefined if the save operation did not complete
     */
    save(snapshot: StoredSnapshot): Promise<StoredSnapshot | undefined>;

    /**
     * Asserts the snapshot should be created for an aggregate.
     * The result assersion is used for .create() method of SnapshotStore
     * @throws If the strategy matches, but the aggregate is not snapshot aware, an error will be thrown.
     * @param aggregate The aggregate root instance to potentially create a snapshot for
     */
    shouldCreateSnapshot(aggregate: AggregateRoot): aggregate is SnapshotAwareAggregateRoot;
}
