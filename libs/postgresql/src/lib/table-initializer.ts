import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { knex } from "knex";

import { SchemaConfiguration } from "./schema-configuration";

@Injectable()
export class TableInitializer implements OnApplicationBootstrap {
    private readonly _logger = new Logger(TableInitializer.name);
    constructor(
        private readonly _schemaConfiguration: SchemaConfiguration,
        private readonly _ensureTablesExist: boolean,
        private readonly _knexConnection: knex.Knex
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
            const [hasAggregatesTable, hasEventsTable] = await Promise.all([
                this._knexConnection.schema.hasTable(this._schemaConfiguration.aggregatesTable),
                this._knexConnection.schema.hasTable(this._schemaConfiguration.eventsTable)
            ]);

            if (hasAggregatesTable) {
                this._logger.log("Skipping aggregates table initialization. Table already exists");
            } else {
                await this._knexConnection.schema.createTable(this._schemaConfiguration.aggregatesTable, (table) => {
                    table.uuid("id").primary();
                    table.integer("version").notNullable();
                });
                this._logger.log("Aggregates table created successfully");
            }

            if (hasEventsTable) {
                this._logger.log("Skipping events table initialization. Table already exists");
            } else {
                await this._knexConnection.schema.createTable(this._schemaConfiguration.eventsTable, (table) => {
                    table.uuid("id").primary();
                    table.uuid("aggregate_root_id").notNullable();
                    table.integer("aggregate_root_version").notNullable();
                    table.text("aggregate_root_name").notNullable();
                    table.text("event_name").notNullable();
                    table.jsonb("payload").notNullable();
                    table.timestamp("created_at", { useTz: true }).notNullable();
                    table.foreign("aggregate_root_id").references(`${this._schemaConfiguration.aggregatesTable}.id`);
                });
                this._logger.log("Events table created successfully");
            }
        } catch (error) {
            this._logger.error(
                "Event Nest table initialization has failed. Tables will have to be created manually.",
                error
            );
        }
    }
}
