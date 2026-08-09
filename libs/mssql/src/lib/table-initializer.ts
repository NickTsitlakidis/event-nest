/* eslint-disable unicorn/consistent-boolean-name */
import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { Knex } from "knex";

import { SchemaConfiguration } from "./schema-configuration";

@Injectable()
export class TableInitializer implements OnApplicationBootstrap {
    private readonly _logger = new Logger(TableInitializer.name);

    constructor(
        private readonly _schemaConfiguration: SchemaConfiguration,
        private readonly _ensureTablesExist: boolean,
        private readonly _knexConnection: Knex
    ) {}

    get ensureTablesExist(): boolean {
        return this._ensureTablesExist;
    }

    get schemaConfiguration(): SchemaConfiguration {
        return this._schemaConfiguration;
    }

    async onApplicationBootstrap(): Promise<void> {
        if (!this._ensureTablesExist) {
            this._logger.debug("Skipping table initialization. ensureTablesExist is set to false or missing");
            return;
        }

        try {
            await this.createAggregatesTableIfMissing();
            await this.createEventsTableIfMissing();
            await this.createSnapshotTableIfMissing();
        } catch (error) {
            this._logger.error("Event Nest table initialization has failed. Tables will have to be created manually.");
            throw error;
        }
    }

    private async createAggregatesTableIfMissing(): Promise<void> {
        const schema = this._knexConnection.schema.withSchema(this._schemaConfiguration.schema);
        if (await schema.hasTable(this._schemaConfiguration.aggregatesTable)) {
            return;
        }
        await schema.createTable(this._schemaConfiguration.aggregatesTable, (table) => {
            table.uuid("id").primary();
            table.integer("version").notNullable();
        });
    }

    private async createEventsTableIfMissing(): Promise<void> {
        const schema = this._knexConnection.schema.withSchema(this._schemaConfiguration.schema);
        if (await schema.hasTable(this._schemaConfiguration.eventsTable)) {
            return;
        }
        await schema.createTable(this._schemaConfiguration.eventsTable, (table) => {
            table.uuid("id").primary();
            table.uuid("aggregate_root_id").notNullable();
            table.integer("aggregate_root_version").notNullable();
            table.specificType("aggregate_root_name", "nvarchar(max)").notNullable();
            table.specificType("event_name", "nvarchar(max)").notNullable();
            table.specificType("payload", "nvarchar(max)").notNullable();
            table.specificType("created_at", "datetime2(3)").notNullable();
            table
                .foreign("aggregate_root_id")
                .references("id")
                .inTable(this._schemaConfiguration.schemaAwareAggregatesTable);
            table.unique(["aggregate_root_id", "aggregate_root_version"]);
        });
    }

    private async createSnapshotTableIfMissing(): Promise<void> {
        const snapshotTable = this._schemaConfiguration.snapshotTable;
        if (!snapshotTable) {
            return;
        }
        const schema = this._knexConnection.schema.withSchema(this._schemaConfiguration.schema);
        if (await schema.hasTable(snapshotTable)) {
            return;
        }
        await schema.createTable(snapshotTable, (table) => {
            table.uuid("id").primary();
            table.uuid("aggregate_root_id").notNullable();
            table.integer("aggregate_root_version").notNullable();
            table.specificType("payload", "nvarchar(max)").notNullable();
            table.integer("revision").notNullable();
            table
                .foreign("aggregate_root_id")
                .references("id")
                .inTable(this._schemaConfiguration.schemaAwareAggregatesTable);
            table.index(["aggregate_root_id", "aggregate_root_version"]);
        });
    }
}
