import { DomainEventEmitter, EVENT_STORE, isNil } from "@event-nest/core";
import { Provider } from "@nestjs/common";
import { knex } from "knex";

import { PostgreSQLModuleAsyncOptions, PostgreSQLModuleOptions } from "./postgresql-module-options";
import { SchemaConfiguration } from "./schema-configuration";
import { PostgreSQLEventStore } from "./storage/postgresql-event-store";
import { TableInitializer } from "./table-initializer";

const KNEX_CONNECTION = Symbol("EVENT_NEST_KNEX_CONNECTION");

export class ModuleProviders {
    static create(options: PostgreSQLModuleOptions): Provider[] {
        return [
            {
                provide: DomainEventEmitter,
                useFactory: () => {
                    return new DomainEventEmitter(options.concurrentSubscriptions);
                }
            },
            {
                provide: KNEX_CONNECTION,
                useValue: buildKnexConnection(options)
            },
            {
                inject: [DomainEventEmitter, KNEX_CONNECTION],
                provide: EVENT_STORE,
                useFactory: (eventEmitter: DomainEventEmitter, knexConnection: knex.Knex) => {
                    return new PostgreSQLEventStore(
                        eventEmitter,
                        options.schemaName,
                        options.aggregatesTableName,
                        options.eventsTableName,
                        knexConnection
                    );
                }
            },
            {
                inject: [KNEX_CONNECTION],
                provide: TableInitializer,
                useFactory: (knexConnection: knex.Knex) => {
                    return new TableInitializer(
                        new SchemaConfiguration(
                            options.schemaName,
                            options.aggregatesTableName,
                            options.eventsTableName
                        ),
                        isNil(options.ensureTablesExist) ? false : options.ensureTablesExist,
                        knexConnection
                    );
                }
            }
        ];
    }

    static createAsync(options: PostgreSQLModuleAsyncOptions): Provider[] {
        const optionsProvider = {
            inject: options.inject,
            provide: "EVENT_NEST_PG_OPTIONS",
            useFactory: async (...parameters: unknown[]) => {
                return await options.useFactory(...parameters);
            }
        };

        const emitterProvider = {
            inject: ["EVENT_NEST_PG_OPTIONS"],
            provide: DomainEventEmitter,
            useFactory: (options: PostgreSQLModuleOptions) => {
                return new DomainEventEmitter(options.concurrentSubscriptions);
            }
        };

        const knexProvider = {
            inject: ["EVENT_NEST_PG_OPTIONS"],
            provide: KNEX_CONNECTION,
            useFactory: (options: PostgreSQLModuleOptions): knex.Knex => {
                return buildKnexConnection(options);
            }
        };

        const eventStoreProvider = {
            inject: ["EVENT_NEST_PG_OPTIONS", DomainEventEmitter, KNEX_CONNECTION],
            provide: EVENT_STORE,
            useFactory: (options: PostgreSQLModuleOptions, emitter: DomainEventEmitter, knexConnection: knex.Knex) => {
                return new PostgreSQLEventStore(
                    emitter,
                    options.schemaName,
                    options.aggregatesTableName,
                    options.eventsTableName,
                    knexConnection
                );
            }
        };

        const tableInitializerProvider = {
            inject: [KNEX_CONNECTION, "EVENT_NEST_PG_OPTIONS"],
            provide: TableInitializer,
            useFactory: (knexConnection: knex.Knex, options: PostgreSQLModuleOptions) => {
                return new TableInitializer(
                    new SchemaConfiguration(options.schemaName, options.aggregatesTableName, options.eventsTableName),
                    isNil(options.ensureTablesExist) ? false : options.ensureTablesExist,
                    knexConnection
                );
            }
        };

        return [optionsProvider, knexProvider, emitterProvider, eventStoreProvider, tableInitializerProvider];
    }
}
function buildKnexConnection(options: PostgreSQLModuleOptions): knex.Knex {
    if (isNil(options.ssl)) {
        return knex({
            client: "pg",
            connection: {
                connectionString: options.connectionUri
            }
        });
    }

    return knex({
        client: "pg",
        connection: {
            connectionString: options.connectionUri,
            ssl: {
                ca: options.ssl.certificate,
                rejectUnauthorized: options.ssl.rejectUnauthorized
            }
        }
    });
}
