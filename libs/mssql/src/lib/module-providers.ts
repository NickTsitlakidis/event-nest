import {
    AbstractSnapshotStore,
    DomainEventEmitter,
    EVENT_STORE,
    NoOpSnapshotStore,
    SNAPSHOT_STORE
} from "@event-nest/core";
import { Provider } from "@nestjs/common";
import { isNil } from "es-toolkit";
import { knex } from "knex";
import { TYPES } from "tedious";

import { MSSQLModuleAsyncOptions, MSSQLModuleOptions } from "./mssql-module-options";
import { SchemaConfiguration } from "./schema-configuration";
import { MSSQLEventStore } from "./storage/mssql-event-store";
import { MSSQLSnapshotStore } from "./storage/mssql-snapshot-store";
import { TableInitializer } from "./table-initializer";

export const KNEX_CONNECTION = Symbol("EVENT_NEST_MSSQL_KNEX_CONNECTION");

export class ModuleProviders {
    static create(options: MSSQLModuleOptions): Provider[] {
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
                inject: [KNEX_CONNECTION, SchemaConfiguration],
                provide: SNAPSHOT_STORE,
                useFactory: (
                    knexConnection: knex.Knex,
                    schemaConfiguration: SchemaConfiguration
                ): AbstractSnapshotStore => {
                    const { snapshotStrategy, snapshotTableName } = options;
                    if (Boolean(snapshotStrategy) !== Boolean(snapshotTableName)) {
                        throw new Error(
                            "To use snapshots, both 'snapshotStrategy' and 'snapshotTableName' must be provided."
                        );
                    }

                    if (!snapshotTableName || !snapshotStrategy) {
                        return new NoOpSnapshotStore();
                    }
                    if (isNil(schemaConfiguration.schemaAwareSnapshotTable)) {
                        throw new Error("Snapshot table configuration is missing.");
                    }

                    return new MSSQLSnapshotStore(
                        snapshotStrategy,
                        schemaConfiguration.schemaAwareSnapshotTable,
                        knexConnection
                    );
                }
            },
            {
                inject: [DomainEventEmitter, KNEX_CONNECTION, SNAPSHOT_STORE, SchemaConfiguration],
                provide: EVENT_STORE,
                useFactory: (
                    eventEmitter: DomainEventEmitter,
                    knexConnection: knex.Knex,
                    snapshotStore: AbstractSnapshotStore,
                    schemaConfiguration: SchemaConfiguration
                ) => {
                    return new MSSQLEventStore(eventEmitter, snapshotStore, schemaConfiguration, knexConnection);
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
            }
        ];
    }

    static createAsync(options: MSSQLModuleAsyncOptions): Provider[] {
        const optionsProvider = {
            inject: options.inject,
            provide: "EVENT_NEST_MSSQL_OPTIONS",
            useFactory: async (...parameters: unknown[]) => {
                return await options.useFactory(...parameters);
            }
        };

        const schemaConfigurationProvider = {
            inject: ["EVENT_NEST_MSSQL_OPTIONS"],
            provide: SchemaConfiguration,
            useFactory: (options: MSSQLModuleOptions) => {
                return new SchemaConfiguration(
                    options.schemaName,
                    options.aggregatesTableName,
                    options.eventsTableName,
                    options.snapshotTableName
                );
            }
        };

        const emitterProvider = {
            inject: ["EVENT_NEST_MSSQL_OPTIONS"],
            provide: DomainEventEmitter,
            useFactory: (options: MSSQLModuleOptions) => {
                return new DomainEventEmitter(options.concurrentSubscriptions);
            }
        };

        const knexProvider = {
            inject: ["EVENT_NEST_MSSQL_OPTIONS"],
            provide: KNEX_CONNECTION,
            useFactory: (options: MSSQLModuleOptions): knex.Knex => {
                return buildKnexConnection(options);
            }
        };

        const eventStoreProvider = {
            inject: [DomainEventEmitter, KNEX_CONNECTION, SNAPSHOT_STORE, SchemaConfiguration],
            provide: EVENT_STORE,
            useFactory: (
                emitter: DomainEventEmitter,
                knexConnection: knex.Knex,
                snapshotStore: AbstractSnapshotStore,
                schemaConfiguration: SchemaConfiguration
            ) => {
                return new MSSQLEventStore(emitter, snapshotStore, schemaConfiguration, knexConnection);
            }
        };

        const tableInitializerProvider = {
            inject: [KNEX_CONNECTION, "EVENT_NEST_MSSQL_OPTIONS", SchemaConfiguration],
            provide: TableInitializer,
            useFactory: (
                knexConnection: knex.Knex,
                options: MSSQLModuleOptions,
                schemaConfiguration: SchemaConfiguration
            ) => {
                return new TableInitializer(
                    schemaConfiguration,
                    isNil(options.ensureTablesExist) ? false : options.ensureTablesExist,
                    knexConnection
                );
            }
        };

        const snapshotStoreProvider = {
            inject: ["EVENT_NEST_MSSQL_OPTIONS", KNEX_CONNECTION, SchemaConfiguration],
            provide: SNAPSHOT_STORE,
            useFactory: (
                options: MSSQLModuleOptions,
                knexConnection: knex.Knex,
                schemaConfiguration: SchemaConfiguration
            ) => {
                const { snapshotStrategy, snapshotTableName } = options;
                if (Boolean(snapshotStrategy) !== Boolean(snapshotTableName)) {
                    throw new Error(
                        "To use snapshots, both 'snapshotStrategy' and 'snapshotTableName' must be provided."
                    );
                }

                if (!snapshotTableName || !snapshotStrategy) {
                    return new NoOpSnapshotStore();
                }
                if (isNil(schemaConfiguration.schemaAwareSnapshotTable)) {
                    throw new Error("Snapshot table configuration is missing.");
                }

                return new MSSQLSnapshotStore(
                    snapshotStrategy,
                    schemaConfiguration.schemaAwareSnapshotTable,
                    knexConnection
                );
            }
        };

        return [
            optionsProvider,
            knexProvider,
            emitterProvider,
            eventStoreProvider,
            tableInitializerProvider,
            snapshotStoreProvider,
            schemaConfigurationProvider
        ];
    }
}
function buildKnexConnection(options: MSSQLModuleOptions): knex.Knex {
    const connection = options.connection;
    if (!isNil(connection.port) && !isNil(connection.instanceName)) {
        throw new Error("MSSQL connection options cannot provide both 'port' and 'instanceName'.");
    }

    const tediousOptions = {
        encrypt: connection.encrypt ?? true,
        instanceName: connection.instanceName,
        lowerCaseGuids: true,
        mapBinding: (value: unknown) => (value instanceof Date ? { type: TYPES.DateTime2, value } : undefined),
        serverName: connection.serverName,
        trustServerCertificate: connection.trustServerCertificate ?? false,
        useUTC: true
    };
    return knex({
        client: "mssql",
        connection: {
            connectionTimeout: connection.connectionTimeout,
            database: connection.database,
            options: tediousOptions,
            password: connection.password,
            port: connection.port,
            requestTimeout: connection.requestTimeout,
            server: connection.server,
            user: connection.user
        },
        pool: {
            min: 0,
            ...options.connectionPool
        }
    });
}
