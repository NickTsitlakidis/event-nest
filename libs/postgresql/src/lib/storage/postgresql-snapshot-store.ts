import { AbstractSnapshotStore, SnapshotStrategy, StoredSnapshot } from "@event-nest/core";
import { Injectable, Logger } from "@nestjs/common";
import { isNil } from "es-toolkit";
import knex from "knex";
import { randomUUID } from "node:crypto";

import { SchemaConfiguration } from "../schema-configuration";
import { SnapshotRow } from "./snapshot-row";

@Injectable()
export class PostgreSQLSnapshotStore extends AbstractSnapshotStore {
    private readonly _logger: Logger;
    private readonly _schemaConfiguration: SchemaConfiguration;

    constructor(
        snapshotStrategy: SnapshotStrategy,
        schemaConfiguration: SchemaConfiguration,
        private readonly _knexConnection: knex.Knex
    ) {
        super(snapshotStrategy);
        this._logger = new Logger(PostgreSQLSnapshotStore.name);
        this._schemaConfiguration = schemaConfiguration;
    }

    async findLatestSnapshotByAggregateId(id: string): Promise<StoredSnapshot | undefined> {
        if (isNil(this._schemaConfiguration.schemaAwareSnapshotTable)) {
            this._logger.error(
                "Can't query the snapshot table beacuse is not configured. Provide snapshotTableName in module options"
            );
            return undefined;
        }

        const startedAt = Date.now();
        const row = await this._knexConnection<SnapshotRow>(this._schemaConfiguration.schemaAwareSnapshotTable)
            .select("*")
            .where("aggregate_root_id", id)
            .orderBy("aggregate_root_version", "desc")
            .first();

        if (isNil(row)) {
            return undefined;
        }

        const duration = Date.now() - startedAt;
        this._logger.debug(`Finding latest snapshot for aggregate ${id} took ${duration}ms`);

        return StoredSnapshot.create(
            row.id,
            row.aggregate_root_version,
            row.revision,
            row.payload,
            row.aggregate_root_id
        );
    }

    generateEntityId(): Promise<string> {
        return Promise.resolve(randomUUID());
    }

    async save(snapshot: StoredSnapshot): Promise<StoredSnapshot | undefined> {
        if (isNil(this._schemaConfiguration.schemaAwareSnapshotTable)) {
            this._logger.error(
                "Can't save snapshot. Database table is not configured. Provide snapshotTableName in module options"
            );

            return undefined;
        }

        const snapshotRow: SnapshotRow = {
            aggregate_root_id: snapshot.aggregateRootId,
            aggregate_root_version: snapshot.aggregateRootVersion,
            id: snapshot.id,
            payload: JSON.stringify(snapshot.payload),
            revision: snapshot.revision
        };

        const startedAt = Date.now();
        await this._knexConnection<SnapshotRow>(this._schemaConfiguration.schemaAwareSnapshotTable).insert(snapshotRow);

        const duration = Date.now() - startedAt;
        this._logger.debug(`Saving snapshot for aggregate ${snapshot.id} took ${duration}ms`);

        return snapshot;
    }
}
