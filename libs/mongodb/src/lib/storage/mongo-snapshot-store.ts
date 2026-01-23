import { AbstractSnapshotStore, SnapshotStrategy, StoredSnapshot } from "@event-nest/core";
import { Injectable, Logger } from "@nestjs/common";
import { isNil } from "es-toolkit";
import { MongoClient, ObjectId } from "mongodb";

import { SnapshotDocument } from "./snapshot-document";

@Injectable()
export class MongoSnapshotStore extends AbstractSnapshotStore {
    private readonly _logger: Logger;

    constructor(
        snapshotStrategy: SnapshotStrategy,
        private readonly _mongoClient: MongoClient,
        private readonly _snapshotsCollectionName?: string
    ) {
        super(snapshotStrategy);
        this._logger = new Logger(MongoSnapshotStore.name);
    }

    async findLatestSnapshotByAggregateId(id: string): Promise<StoredSnapshot | undefined> {
        if (isNil(this._snapshotsCollectionName)) {
            this._logger.debug(
                "Can't query the snapshot collection because it is not configured. Provide snapshotCollection in module options"
            );
            return undefined;
        }

        const startedAt = Date.now();
        const document = await this._mongoClient
            .db()
            .collection<SnapshotDocument>(this._snapshotsCollectionName)
            .findOne({ aggregateRootId: id }, { sort: { aggregateRootVersion: -1 } });

        if (isNil(document)) {
            return undefined;
        }

        const duration = Date.now() - startedAt;
        this._logger.debug(`Finding latest snapshot for aggregate ${id} took ${duration}ms`);

        return StoredSnapshot.create(
            document._id.toHexString(),
            document["aggregateRootVersion"],
            document["revision"],
            document["payload"],
            document["aggregateRootId"]
        );
    }

    generateEntityId(): Promise<string> {
        return Promise.resolve(new ObjectId().toHexString());
    }

    async save(snapshot: StoredSnapshot): Promise<StoredSnapshot | undefined> {
        if (isNil(this._snapshotsCollectionName)) {
            this._logger.debug(
                "Can't save snapshot. Database collection is not configured. Provide snapshotCollection in module options"
            );

            return undefined;
        }

        const snapshotDocument: SnapshotDocument = {
            _id: new ObjectId(snapshot.id),
            aggregateRootId: snapshot.aggregateRootId,
            aggregateRootVersion: snapshot.aggregateRootVersion,
            payload: snapshot.payload,
            revision: snapshot.revision
        };

        const startedAt = Date.now();
        await this._mongoClient
            .db()
            .collection<SnapshotDocument>(this._snapshotsCollectionName)
            .insertOne(snapshotDocument);

        const duration = Date.now() - startedAt;
        this._logger.debug(`Saving snapshot for aggregate ${snapshot.id} took ${duration}ms`);

        return snapshot;
    }
}
