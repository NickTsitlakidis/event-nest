import { AbstractSnapshotStore, SnapshotStrategy, StoredSnapshot } from "@event-nest/core";
import { Injectable, Logger } from "@nestjs/common";
import { isNil, isNotNil } from "es-toolkit";
import { Knex } from "knex";
import { randomUUID } from "node:crypto";

import { SnapshotRow } from "./snapshot-row";

@Injectable()
export class MSSQLSnapshotStore extends AbstractSnapshotStore {
    private readonly _logger: Logger;

    constructor(
        snapshotStrategy: SnapshotStrategy,
        private readonly _schemaAwareSnapshotTable: string,
        private readonly _knexConnection: Knex
    ) {
        super(snapshotStrategy);
        this._logger = new Logger(MSSQLSnapshotStore.name);
    }

    async deleteByAggregateId(id: string, transaction?: Knex.Transaction): Promise<void> {
        const startedAt = Date.now();
        const connection = isNotNil(transaction) ? transaction : this._knexConnection;
        await connection<SnapshotRow>(this._schemaAwareSnapshotTable).where("aggregate_root_id", id).delete();
        this._logger.debug(`Deleting snapshots for aggregate ${id} took ${Date.now() - startedAt}ms`);
    }

    async findLatestSnapshotByAggregateId(id: string): Promise<StoredSnapshot | undefined> {
        const row = await this._knexConnection<SnapshotRow>(this._schemaAwareSnapshotTable)
            .select("*")
            .where("aggregate_root_id", id)
            .orderBy("aggregate_root_version", "desc")
            .orderBy("id", "desc")
            .first();

        return isNil(row)
            ? undefined
            : StoredSnapshot.create(
                  row.id,
                  row.aggregate_root_version,
                  row.revision,
                  JSON.parse(row.payload) as unknown,
                  row.aggregate_root_id
              );
    }

    generateEntityId(): Promise<string> {
        return Promise.resolve(randomUUID());
    }

    async save(snapshot: StoredSnapshot): Promise<StoredSnapshot | undefined> {
        const row: SnapshotRow = {
            aggregate_root_id: snapshot.aggregateRootId,
            aggregate_root_version: snapshot.aggregateRootVersion,
            id: snapshot.id,
            payload: JSON.stringify(snapshot.payload),
            revision: snapshot.revision
        };

        const startedAt = Date.now();
        await this._knexConnection<SnapshotRow>(this._schemaAwareSnapshotTable).insert(row);
        this._logger.debug(`Saving snapshot with id ${snapshot.id} took ${Date.now() - startedAt}ms`);
        return snapshot;
    }
}
