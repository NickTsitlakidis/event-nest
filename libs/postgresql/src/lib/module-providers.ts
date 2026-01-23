import { DomainEventEmitter, EVENT_STORE, NoSnapshotStrategy, SnapshotStrategy } from "@event-nest/core";
import { Provider } from "@nestjs/common";
import { isNil } from "es-toolkit";
import { knex } from "knex";

import { PostgreSQLModuleAsyncOptions, PostgreSQLModuleOptions } from "./postgresql-module-options";
import { SchemaConfiguration } from "./schema-configuration";
import { PostgreSQLEventStore } from "./storage/postgresql-event-store";
import { PostgreSQLSnapshotStore } from "./storage/postgresql-snapshot-store";
import { TableInitializer } from "./table-initializer";

const KNEX_CONNECTION = Symbol("EVENT_NEST_KNEX_CONNECTION");

export class ModuleProviders {
    static create(options: PostgreSQLModuleOptions): Provider[] {
        return [
            {
                provide: SchemaConfiguration,
                useFactory: () => {
                    return new SchemaConfiguration(
                        options.schemaName,
                        options.aggregatesTableName,
                        options.eventsTableName,
                        options.snapshotTableName
                    );
                }
            },
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
                inject: [SnapshotStrategy, SchemaConfiguration, KNEX_CONNECTION],
                provide: PostgreSQLSnapshotStore,
                useFactory: (
                    strategy: SnapshotStrategy,
                    schemaConfiguration: SchemaConfiguration,
                    knexConnection: knex.Knex
                ) => {
                    return new PostgreSQLSnapshotStore(strategy, schemaConfiguration, knexConnection);
                }
            },
            {
                inject: [DomainEventEmitter, KNEX_CONNECTION, PostgreSQLSnapshotStore, SchemaConfiguration],
                provide: EVENT_STORE,
                useFactory: (
                    eventEmitter: DomainEventEmitter,
                    knexConnection: knex.Knex,
                    snapshotStore: PostgreSQLSnapshotStore,
                    schemaConfiguration: SchemaConfiguration
                ) => {
                    return new PostgreSQLEventStore(eventEmitter, snapshotStore, schemaConfiguration, knexConnection);
                }
            },
            {
                inject: [KNEX_CONNECTION, SchemaConfiguration],
                provide: TableInitializer,
                useFactory: (knexConnection: knex.Knex, schemaConfiguration: SchemaConfiguration) => {
                    return new TableInitializer(
                        schemaConfiguration,
                        isNil(options.ensureTablesExist) ? false : options.ensureTablesExist,
                        knexConnection
                    );
                }
            },
            {
                provide: SnapshotStrategy,
                useFactory: () => options.snapshotStrategy || new NoSnapshotStrategy()
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

        const schemaConfigurationProvider = {
            inject: ["EVENT_NEST_PG_OPTIONS"],
            provide: SchemaConfiguration,
            useFactory: (options: PostgreSQLModuleOptions) => {
                return new SchemaConfiguration(
                    options.schemaName,
                    options.aggregatesTableName,
                    options.eventsTableName,
                    options.snapshotTableName
                );
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
            inject: [DomainEventEmitter, KNEX_CONNECTION, PostgreSQLSnapshotStore, SchemaConfiguration],
            provide: EVENT_STORE,
            useFactory: (
                emitter: DomainEventEmitter,
                knexConnection: knex.Knex,
                snapshotStore: PostgreSQLSnapshotStore,
                schemaConfiguration: SchemaConfiguration
            ) => {
                return new PostgreSQLEventStore(emitter, snapshotStore, schemaConfiguration, knexConnection);
            }
        };

        const tableInitializerProvider = {
            inject: [KNEX_CONNECTION, "EVENT_NEST_PG_OPTIONS", SchemaConfiguration],
            provide: TableInitializer,
            useFactory: (
                knexConnection: knex.Knex,
                options: PostgreSQLModuleOptions,
                schemaConfiguration: SchemaConfiguration
            ) => {
                return new TableInitializer(
                    schemaConfiguration,
                    isNil(options.ensureTablesExist) ? false : options.ensureTablesExist,
                    knexConnection
                );
            }
        };

        const snapshotStrategyProvider = {
            inject: ["EVENT_NEST_PG_OPTIONS"],
            provide: SnapshotStrategy,
            useFactory: (options: PostgreSQLModuleOptions) => options.snapshotStrategy || new NoSnapshotStrategy()
        };

        const snapshotStoreInject = {
            inject: [SnapshotStrategy, KNEX_CONNECTION, SchemaConfiguration],
            provide: PostgreSQLSnapshotStore,
            useFactory: (
                strategy: SnapshotStrategy,
                knexConnection: knex.Knex,
                schemaConfiguration: SchemaConfiguration
            ) => {
                return new PostgreSQLSnapshotStore(strategy, schemaConfiguration, knexConnection);
            }
        };

        return [
            optionsProvider,
            knexProvider,
            emitterProvider,
            eventStoreProvider,
            tableInitializerProvider,
            snapshotStrategyProvider,
            snapshotStoreInject,
            schemaConfigurationProvider
        ];
    }
}
function buildKnexConnection(options: PostgreSQLModuleOptions): knex.Knex {
    if (isNil(options.ssl)) {
        return knex({
            client: "pg",
            connection: {
                connectionString: options.connectionUri
            },
            pool: options.connectionPool
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
        },
        pool: options.connectionPool
    });
}
