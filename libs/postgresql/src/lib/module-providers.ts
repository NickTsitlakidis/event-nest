import { Provider } from "@nestjs/common";
import { EVENT_STORE, DomainEventEmitter, isNil } from "@event-nest/core";
import { PostgreSQLModuleAsyncOptions, PostgreSQLModuleOptions } from "./postgresql-module-options";
import { PostgreSQLEventStore } from "./storage/postgresql-event-store";
import { knex } from "knex";

const KNEX_CONNECTION = Symbol("EVENT_NEST_KNEX_CONNECTION");

function buildKnexConnection(options: PostgreSQLModuleOptions): knex.Knex {
    if (isNil(options.ssl)) {
        return knex({
            client: "pg",
            connection: {
                connectionString: options.connectionUri,
                ssl: { rejectUnauthorized: false }
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
                provide: EVENT_STORE,
                useFactory: (eventEmitter: DomainEventEmitter, knexConnection: knex.Knex) => {
                    return new PostgreSQLEventStore(
                        eventEmitter,
                        options.schemaName,
                        options.aggregatesTableName,
                        options.eventsTableName,
                        knexConnection
                    );
                },
                inject: [DomainEventEmitter, KNEX_CONNECTION]
            }
        ];
    }

    static createAsync(options: PostgreSQLModuleAsyncOptions): Provider[] {
        const optionsProvider = {
            provide: "EVENT_NEST_PG_OPTIONS",
            useFactory: async (...args: unknown[]) => {
                return await options.useFactory(...args);
            },
            inject: options.inject
        };

        const emitterProvider = {
            provide: DomainEventEmitter,
            useFactory: (options: PostgreSQLModuleOptions) => {
                return new DomainEventEmitter(options.concurrentSubscriptions);
            },
            inject: ["EVENT_NEST_PG_OPTIONS"]
        };

        const knexProvider = {
            provide: KNEX_CONNECTION,
            useFactory: (options: PostgreSQLModuleOptions): knex.Knex => {
                return buildKnexConnection(options);
            },
            inject: ["EVENT_NEST_PG_OPTIONS"]
        };

        const eventStoreProvider = {
            provide: EVENT_STORE,
            useFactory: (options: PostgreSQLModuleOptions, emitter: DomainEventEmitter, knexConnection: knex.Knex) => {
                return new PostgreSQLEventStore(
                    emitter,
                    options.schemaName,
                    options.aggregatesTableName,
                    options.eventsTableName,
                    knexConnection
                );
            },
            inject: ["EVENT_NEST_PG_OPTIONS", DomainEventEmitter, KNEX_CONNECTION]
        };

        return [optionsProvider, knexProvider, emitterProvider, eventStoreProvider];
    }
}
