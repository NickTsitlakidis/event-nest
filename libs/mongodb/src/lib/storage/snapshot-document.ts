import { ObjectId } from "mongodb";

export interface SnapshotDocument {
    _id: ObjectId;
    aggregateRootId: string;
    aggregateRootVersion: number;
    payload: unknown;
    revision: number;
}
