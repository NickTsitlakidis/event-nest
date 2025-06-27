import { DomainEventEmitter, EVENT_STORE } from "@event-nest/core";
import { Provider } from "@nestjs/common";
import { isNil } from "es-toolkit";
import { knex } from "knex";
// Import mysql2 to satisfy the dependency requirement even if not directly used
import "mysql2";

import { DatabaseConfiguration } from "./database-configuration";
import { MySQLModuleAsyncOptions, MySQLModuleOptions } from "./mysql-module-options";
import { MySQLEventStore } from "./storage/mysql-event-store";
import { TableInitializer } from "./table-initializer";

const KNEX_CONNECTION = Symbol("EVENT_NEST_KNEX_CONNECTION");

export class ModuleProviders {
    static create(options: MySQLModuleOptions): Provider[] {
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
                    return new MySQLEventStore(
                        eventEmitter,
                        options.databaseName,
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
                        new DatabaseConfiguration(
                            options.databaseName,
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

    static createAsync(options: MySQLModuleAsyncOptions): Provider[] {
        const optionsProvider = {
            inject: options.inject,
            provide: "EVENT_NEST_MYSQL_OPTIONS",
            useFactory: async (...parameters: unknown[]) => {
                return await options.useFactory(...parameters);
            }
        };

        const emitterProvider = {
            inject: ["EVENT_NEST_MYSQL_OPTIONS"],
            provide: DomainEventEmitter,
            useFactory: (options: MySQLModuleOptions) => {
                return new DomainEventEmitter(options.concurrentSubscriptions);
            }
        };

        const knexProvider = {
            inject: ["EVENT_NEST_MYSQL_OPTIONS"],
            provide: KNEX_CONNECTION,
            useFactory: (options: MySQLModuleOptions): knex.Knex => {
                return buildKnexConnection(options);
            }
        };

        const eventStoreProvider = {
            inject: ["EVENT_NEST_MYSQL_OPTIONS", DomainEventEmitter, KNEX_CONNECTION],
            provide: EVENT_STORE,
            useFactory: (options: MySQLModuleOptions, emitter: DomainEventEmitter, knexConnection: knex.Knex) => {
                return new MySQLEventStore(
                    emitter,
                    options.databaseName,
                    options.aggregatesTableName,
                    options.eventsTableName,
                    knexConnection
                );
            }
        };

        const tableInitializerProvider = {
            inject: [KNEX_CONNECTION, "EVENT_NEST_MYSQL_OPTIONS"],
            provide: TableInitializer,
            useFactory: (knexConnection: knex.Knex, options: MySQLModuleOptions) => {
                return new TableInitializer(
                    new DatabaseConfiguration(
                        options.databaseName,
                        options.aggregatesTableName,
                        options.eventsTableName
                    ),
                    isNil(options.ensureTablesExist) ? false : options.ensureTablesExist,
                    knexConnection
                );
            }
        };

        return [optionsProvider, knexProvider, emitterProvider, eventStoreProvider, tableInitializerProvider];
    }
}

function buildKnexConnection(options: MySQLModuleOptions): knex.Knex {
    if (isNil(options.ssl)) {
        return knex({
            client: "mysql2",
            connection: {
                connectionString: options.connectionUri,
                database: options.databaseName
            },
            pool: options.connectionPool
        });
    }

    return knex({
        client: "mysql2",
        connection: {
            connectionString: options.connectionUri,
            database: options.databaseName,
            ssl: {
                ca: options.ssl.certificate,
                rejectUnauthorized: options.ssl.rejectUnauthorized
            }
        },
        pool: options.connectionPool
    });
}
