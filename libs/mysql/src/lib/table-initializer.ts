import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { knex } from "knex";

import { DatabaseConfiguration } from "./database-configuration";

@Injectable()
export class TableInitializer implements OnApplicationBootstrap {
    private readonly _logger = new Logger(TableInitializer.name);
    constructor(
        private readonly _databaseConfiguration: DatabaseConfiguration,
        private readonly _ensureTablesExist: boolean,
        private readonly _knexConnection: knex.Knex
    ) {}

    get databaseConfiguration(): DatabaseConfiguration {
        return this._databaseConfiguration;
    }

    get ensureTablesExist(): boolean {
        return this._ensureTablesExist;
    }

    async onApplicationBootstrap(): Promise<void> {
        if (!this._ensureTablesExist) {
            this._logger.debug("Skipping table initialization. ensureTablesExist is set to false or missing");
            return;
        }

        try {
            const [hasAggregatesTable, hasEventsTable] = await Promise.all([
                this._knexConnection.schema.hasTable(this._databaseConfiguration.aggregatesTable),
                this._knexConnection.schema.hasTable(this._databaseConfiguration.eventsTable)
            ]);

            if (hasAggregatesTable) {
                this._logger.log("Skipping aggregates table initialization. Table already exists");
            } else {
                await this._knexConnection.schema.createTable(this._databaseConfiguration.aggregatesTable, (table) => {
                    table.string("id", 36).primary();
                    table.integer("version").notNullable();
                });
                this._logger.log("Aggregates table created successfully");
            }

            if (hasEventsTable) {
                this._logger.log("Skipping events table initialization. Table already exists");
            } else {
                await this._knexConnection.schema.createTable(this._databaseConfiguration.eventsTable, (table) => {
                    table.string("id", 36).primary();
                    table.string("aggregate_root_id", 36).notNullable();
                    table.integer("aggregate_root_version").notNullable();
                    table.text("aggregate_root_name").notNullable();
                    table.text("event_name").notNullable();
                    table.json("payload").notNullable();
                    table.specificType("created_at", "DATETIME(3)").notNullable();
                    table
                        .foreign("aggregate_root_id")
                        .references("id")
                        .inTable(this._databaseConfiguration.aggregatesTable);
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
