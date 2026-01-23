import { AggregateRoot } from "../../aggregate-root/aggregate-root";
import { StoredSnapshot } from "./stored-snapshot";

export interface SnapshotStore {
    /**
     * Finds the most recent snapshot for a given aggregate root by its ID.
     * @param id The unique identifier of the aggregate root
     * @returns A promise that resolves to the latest stored snapshot, or undefined if no snapshot exists
     */
    findLatestSnapshotByAggregateId(id: string): Promise<StoredSnapshot | undefined>;

    /**
     * Each storage solution has its own way of dealing with unique ids. This method's implementation should reflect
     * the way the storage solution generates unique ids. For example, in a MongoDB database this would usually return
     * a String representation of a MongoDB ObjectId.
     */
    generateEntityId(): Promise<string>;

    /**
     * Conditionally creates a snapshot for the given aggregate root if the snapshot
     * strategy determines that a snapshot should be created. The method checks if
     * the aggregate root is snapshot-aware and if the strategy conditions are met.
     * @param aggregateRoot The aggregate root instance to potentially create a snapshot for
     * @returns A promise that resolves with boolean indicating snapshot creation complete status
     */
    maybeCreate(aggregateRoot: AggregateRoot): Promise<boolean>;

    /**
     * Saves a snapshot to the storage
     * @param aggregate The snapshot to be saved
     * @returns A promise that resolves to the saved snapshot, or undefined if the save operation did not complete
     */
    save(aggregate: StoredSnapshot): Promise<StoredSnapshot | undefined>;
}
