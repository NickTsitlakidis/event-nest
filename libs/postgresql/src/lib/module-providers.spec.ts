import { Test } from "@nestjs/testing";
// eslint-disable-next-line
import * as knex from "knex";
const mockedKnex = jest.fn().mockImplementation(() => {
    return {};
});
jest.mock("knex", () => {
    return {
        knex: mockedKnex
    };
});

import { DomainEventEmitter, EVENT_STORE } from "@event-nest/core";

import { ModuleProviders } from "./module-providers";
import { PostgreSQLModuleAsyncOptions, PostgreSQLModuleOptions } from "./postgresql-module-options";
import { PostgreSQLEventStore } from "./storage/postgresql-event-store";
import { TableInitializer } from "./table-initializer";

describe("PostgreSQLModuleProviders", () => {
    describe("create", () => {
        test("creates TableInitializer provider with false flag", async () => {
            const options: PostgreSQLModuleOptions = {
                aggregatesTableName: "aggregates",
                connectionUri: "postgres://test:test@docker:32770/db",
                ensureTablesExist: false,
                eventsTableName: "events",
                schemaName: "the-schema"
            };
            const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
            const initializer: TableInitializer = module.get(TableInitializer);
            expect(initializer).toBeDefined();
            expect(initializer).toBeInstanceOf(TableInitializer);
            expect(initializer.ensureTablesExist).toBe(false);
            expect(initializer.schemaConfiguration.aggregatesTable).toBe(options.aggregatesTableName);
            expect(initializer.schemaConfiguration.eventsTable).toBe(options.eventsTableName);
            expect(initializer.schemaConfiguration.schema).toBe(options.schemaName);
        });

        test("creates TableInitializer provider with missing flag", async () => {
            const options: PostgreSQLModuleOptions = {
                aggregatesTableName: "aggregates",
                connectionUri: "postgres://test:test@docker:32770/db",
                eventsTableName: "events",
                schemaName: "the-schema"
            };
            const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
            const initializer: TableInitializer = module.get(TableInitializer);
            expect(initializer).toBeDefined();
            expect(initializer).toBeInstanceOf(TableInitializer);
            expect(initializer.ensureTablesExist).toBe(false);
            expect(initializer.schemaConfiguration.aggregatesTable).toBe(options.aggregatesTableName);
            expect(initializer.schemaConfiguration.eventsTable).toBe(options.eventsTableName);
            expect(initializer.schemaConfiguration.schema).toBe(options.schemaName);
        });

        test("creates TableInitializer provider with true flag", async () => {
            const options: PostgreSQLModuleOptions = {
                aggregatesTableName: "aggregates",
                connectionUri: "postgres://test:test@docker:32770/db",
                ensureTablesExist: true,
                eventsTableName: "events",
                schemaName: "the-schema"
            };
            const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
            const initializer: TableInitializer = module.get(TableInitializer);
            expect(initializer).toBeDefined();
            expect(initializer).toBeInstanceOf(TableInitializer);
            expect(initializer.ensureTablesExist).toBe(true);
            expect(initializer.schemaConfiguration.aggregatesTable).toBe(options.aggregatesTableName);
            expect(initializer.schemaConfiguration.eventsTable).toBe(options.eventsTableName);
            expect(initializer.schemaConfiguration.schema).toBe(options.schemaName);
        });

        test("creates PostgresqlEventStore provider", async () => {
            const options: PostgreSQLModuleOptions = {
                aggregatesTableName: "aggregates",
                connectionUri: "postgres://test:test@docker:32770/db",
                eventsTableName: "events",
                schemaName: "the-schema"
            };
            const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
            const eventStore: PostgreSQLEventStore = module.get(EVENT_STORE);
            expect(eventStore).toBeDefined();
            expect(eventStore).toBeInstanceOf(PostgreSQLEventStore);
            expect(eventStore.eventsTableName).toBe(options.eventsTableName);
            expect(eventStore.aggregatesTableName).toBe(options.aggregatesTableName);
            expect(eventStore.schemaName).toBe(options.schemaName);
        });

        test("creates DomainEventEmitter provider with concurrent option", async () => {
            const options: PostgreSQLModuleOptions = {
                aggregatesTableName: "aggregates",
                concurrentSubscriptions: true,
                connectionUri: "postgres://test:test@docker:32770/db",
                eventsTableName: "events",
                schemaName: "the-schema"
            };
            const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
            const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
            expect(emitter).toBeDefined();
            expect(emitter).toBeInstanceOf(DomainEventEmitter);
            expect(emitter.concurrentSubscriptions).toBe(options.concurrentSubscriptions);
        });

        test("creates DomainEventEmitter provider without concurrent option", async () => {
            const options: PostgreSQLModuleOptions = {
                aggregatesTableName: "aggregates",
                connectionUri: "postgres://test:test@docker:32770/db",
                eventsTableName: "events",
                schemaName: "the-schema"
            };
            const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
            const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
            expect(emitter).toBeDefined();
            expect(emitter).toBeInstanceOf(DomainEventEmitter);
            expect(emitter.concurrentSubscriptions).toBe(false);
        });

        test("skips ssl configuration when it is not provided", async () => {
            const options: PostgreSQLModuleOptions = {
                aggregatesTableName: "aggregates",
                connectionUri: "postgres://test:test@docker:32770/db",
                eventsTableName: "events",
                schemaName: "the-schema"
            };
            await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
            expect(mockedKnex).toHaveBeenCalledWith({
                client: "pg",
                connection: {
                    connectionString: options.connectionUri
                }
            });
        });

        test("enables ssl when ssl options are provided", async () => {
            const options: PostgreSQLModuleOptions = {
                aggregatesTableName: "aggregates",
                connectionUri: "postgres://test:test@docker:32770/db",
                eventsTableName: "events",
                schemaName: "the-schema",
                ssl: {
                    certificate: "ca-cert",
                    rejectUnauthorized: true
                }
            };
            await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
            expect(mockedKnex).toHaveBeenCalledWith({
                client: "pg",
                connection: {
                    connectionString: options.connectionUri,
                    ssl: {
                        ca: "ca-cert",
                        rejectUnauthorized: true
                    }
                }
            });
        });
    });

    describe("createAsync", () => {
        test("creates TableInitializer provider with false flag when options is Promise", async () => {
            const options: PostgreSQLModuleAsyncOptions = {
                useFactory: () => {
                    return Promise.resolve({
                        aggregatesTableName: "async-aggregates",
                        connectionUri: "postgres://test:test@docker:32770/db",
                        ensureTablesExist: false,
                        eventsTableName: "async-events",
                        schemaName: "the-async-schema"
                    });
                }
            };
            const module = await Test.createTestingModule({
                providers: ModuleProviders.createAsync(options)
            }).compile();
            const initializer: TableInitializer = module.get(TableInitializer);
            expect(initializer).toBeDefined();
            expect(initializer).toBeInstanceOf(TableInitializer);
            expect(initializer.ensureTablesExist).toBe(false);
            expect(initializer.schemaConfiguration.aggregatesTable).toBe("async-aggregates");
            expect(initializer.schemaConfiguration.eventsTable).toBe("async-events");
            expect(initializer.schemaConfiguration.schema).toBe("the-async-schema");
        });

        test("creates TableInitializer provider with false flag when options is object", async () => {
            const options: PostgreSQLModuleAsyncOptions = {
                useFactory: () => {
                    return {
                        aggregatesTableName: "async-aggregates",
                        connectionUri: "postgres://test:test@docker:32770/db",
                        ensureTablesExist: false,
                        eventsTableName: "async-events",
                        schemaName: "the-async-schema"
                    };
                }
            };
            const module = await Test.createTestingModule({
                providers: ModuleProviders.createAsync(options)
            }).compile();
            const initializer: TableInitializer = module.get(TableInitializer);
            expect(initializer).toBeDefined();
            expect(initializer).toBeInstanceOf(TableInitializer);
            expect(initializer.ensureTablesExist).toBe(false);
            expect(initializer.schemaConfiguration.aggregatesTable).toBe("async-aggregates");
            expect(initializer.schemaConfiguration.eventsTable).toBe("async-events");
            expect(initializer.schemaConfiguration.schema).toBe("the-async-schema");
        });

        test("creates TableInitializer provider with missing flag when options is Promise", async () => {
            const options: PostgreSQLModuleAsyncOptions = {
                useFactory: () => {
                    return Promise.resolve({
                        aggregatesTableName: "async-aggregates",
                        connectionUri: "postgres://test:test@docker:32770/db",
                        eventsTableName: "async-events",
                        schemaName: "the-async-schema"
                    });
                }
            };
            const module = await Test.createTestingModule({
                providers: ModuleProviders.createAsync(options)
            }).compile();
            const initializer: TableInitializer = module.get(TableInitializer);
            expect(initializer).toBeDefined();
            expect(initializer).toBeInstanceOf(TableInitializer);
            expect(initializer.ensureTablesExist).toBe(false);
            expect(initializer.schemaConfiguration.aggregatesTable).toBe("async-aggregates");
            expect(initializer.schemaConfiguration.eventsTable).toBe("async-events");
            expect(initializer.schemaConfiguration.schema).toBe("the-async-schema");
        });

        test("creates TableInitializer provider with missing flag when options is object", async () => {
            const options: PostgreSQLModuleAsyncOptions = {
                useFactory: () => {
                    return {
                        aggregatesTableName: "async-aggregates",
                        connectionUri: "postgres://test:test@docker:32770/db",
                        eventsTableName: "async-events",
                        schemaName: "the-async-schema"
                    };
                }
            };
            const module = await Test.createTestingModule({
                providers: ModuleProviders.createAsync(options)
            }).compile();
            const initializer: TableInitializer = module.get(TableInitializer);
            expect(initializer).toBeDefined();
            expect(initializer).toBeInstanceOf(TableInitializer);
            expect(initializer.ensureTablesExist).toBe(false);
            expect(initializer.schemaConfiguration.aggregatesTable).toBe("async-aggregates");
            expect(initializer.schemaConfiguration.eventsTable).toBe("async-events");
            expect(initializer.schemaConfiguration.schema).toBe("the-async-schema");
        });

        test("creates TableInitializer provider with true flag when options is Promise", async () => {
            const options: PostgreSQLModuleAsyncOptions = {
                useFactory: () => {
                    return Promise.resolve({
                        aggregatesTableName: "async-aggregates",
                        connectionUri: "postgres://test:test@docker:32770/db",
                        ensureTablesExist: true,
                        eventsTableName: "async-events",
                        schemaName: "the-async-schema"
                    });
                }
            };
            const module = await Test.createTestingModule({
                providers: ModuleProviders.createAsync(options)
            }).compile();
            const initializer: TableInitializer = module.get(TableInitializer);
            expect(initializer).toBeDefined();
            expect(initializer).toBeInstanceOf(TableInitializer);
            expect(initializer.ensureTablesExist).toBe(true);
            expect(initializer.schemaConfiguration.aggregatesTable).toBe("async-aggregates");
            expect(initializer.schemaConfiguration.eventsTable).toBe("async-events");
            expect(initializer.schemaConfiguration.schema).toBe("the-async-schema");
        });

        test("creates TableInitializer provider with true flag when options is object", async () => {
            const options: PostgreSQLModuleAsyncOptions = {
                useFactory: () => {
                    return {
                        aggregatesTableName: "async-aggregates",
                        connectionUri: "postgres://test:test@docker:32770/db",
                        ensureTablesExist: true,
                        eventsTableName: "async-events",
                        schemaName: "the-async-schema"
                    };
                }
            };
            const module = await Test.createTestingModule({
                providers: ModuleProviders.createAsync(options)
            }).compile();
            const initializer: TableInitializer = module.get(TableInitializer);
            expect(initializer).toBeDefined();
            expect(initializer).toBeInstanceOf(TableInitializer);
            expect(initializer.ensureTablesExist).toBe(true);
            expect(initializer.schemaConfiguration.aggregatesTable).toBe("async-aggregates");
            expect(initializer.schemaConfiguration.eventsTable).toBe("async-events");
            expect(initializer.schemaConfiguration.schema).toBe("the-async-schema");
        });

        test("creates PostgreSQLEventStore provider when options is Promise", async () => {
            const options: PostgreSQLModuleAsyncOptions = {
                useFactory: () => {
                    return Promise.resolve({
                        aggregatesTableName: "async-aggregates",
                        connectionUri: "postgres://test:test@docker:32770/db",
                        eventsTableName: "async-events",
                        schemaName: "the-async-schema"
                    });
                }
            };
            const module = await Test.createTestingModule({
                providers: ModuleProviders.createAsync(options)
            }).compile();
            const eventStore: PostgreSQLEventStore = module.get(EVENT_STORE);
            expect(eventStore).toBeDefined();
            expect(eventStore).toBeInstanceOf(PostgreSQLEventStore);
            expect(eventStore.eventsTableName).toBe("async-events");
            expect(eventStore.aggregatesTableName).toBe("async-aggregates");
            expect(eventStore.schemaName).toBe("the-async-schema");
        });

        test("creates PostgreSQLEventStore provider when options is object", async () => {
            const options: PostgreSQLModuleAsyncOptions = {
                useFactory: () => {
                    return {
                        aggregatesTableName: "async-aggregates",
                        connectionUri: "postgres://test:test@docker:32770/db",
                        eventsTableName: "async-events",
                        schemaName: "the-async-schema"
                    };
                }
            };
            const module = await Test.createTestingModule({
                providers: ModuleProviders.createAsync(options)
            }).compile();
            const eventStore: PostgreSQLEventStore = module.get(EVENT_STORE);
            expect(eventStore).toBeDefined();
            expect(eventStore).toBeInstanceOf(PostgreSQLEventStore);
            expect(eventStore.eventsTableName).toBe("async-events");
            expect(eventStore.aggregatesTableName).toBe("async-aggregates");
            expect(eventStore.schemaName).toBe("the-async-schema");
        });

        test("creates DomainEventEmitter provider with concurrent option when options is Promise", async () => {
            const options: PostgreSQLModuleAsyncOptions = {
                useFactory: () => {
                    return Promise.resolve({
                        aggregatesTableName: "async-aggregates",
                        concurrentSubscriptions: true,
                        connectionUri: "postgres://test:test@docker:32770/db",
                        eventsTableName: "async-events",
                        schemaName: "the-async-schema"
                    });
                }
            };
            const module = await Test.createTestingModule({
                providers: ModuleProviders.createAsync(options)
            }).compile();
            const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
            expect(emitter).toBeDefined();
            expect(emitter).toBeInstanceOf(DomainEventEmitter);
            expect(emitter.concurrentSubscriptions).toBe(true);
        });

        test("creates DomainEventEmitter provider with concurrent option when options is object", async () => {
            const options: PostgreSQLModuleAsyncOptions = {
                useFactory: () => {
                    return {
                        aggregatesTableName: "async-aggregates",
                        concurrentSubscriptions: true,
                        connectionUri: "postgres://test:test@docker:32770/db",
                        eventsTableName: "async-events",
                        schemaName: "the-async-schema"
                    };
                }
            };
            const module = await Test.createTestingModule({
                providers: ModuleProviders.createAsync(options)
            }).compile();
            const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
            expect(emitter).toBeDefined();
            expect(emitter).toBeInstanceOf(DomainEventEmitter);
            expect(emitter.concurrentSubscriptions).toBe(true);
        });

        test("creates DomainEventEmitter provider without concurrent option when options is Promise", async () => {
            const options: PostgreSQLModuleAsyncOptions = {
                useFactory: () => {
                    return Promise.resolve({
                        aggregatesTableName: "async-aggregates",
                        connectionUri: "postgres://test:test@docker:32770/db",
                        eventsTableName: "async-events",
                        schemaName: "the-async-schema"
                    });
                }
            };
            const module = await Test.createTestingModule({
                providers: ModuleProviders.createAsync(options)
            }).compile();
            const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
            expect(emitter).toBeDefined();
            expect(emitter).toBeInstanceOf(DomainEventEmitter);
            expect(emitter.concurrentSubscriptions).toBe(false);
        });

        test("creates DomainEventEmitter provider without concurrent option when options is object", async () => {
            const options: PostgreSQLModuleAsyncOptions = {
                useFactory: () => {
                    return {
                        aggregatesTableName: "async-aggregates",
                        connectionUri: "postgres://test:test@docker:32770/db",
                        eventsTableName: "async-events",
                        schemaName: "the-async-schema"
                    };
                }
            };
            const module = await Test.createTestingModule({
                providers: ModuleProviders.createAsync(options)
            }).compile();
            const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
            expect(emitter).toBeDefined();
            expect(emitter).toBeInstanceOf(DomainEventEmitter);
            expect(emitter.concurrentSubscriptions).toBe(false);
        });

        test("skips ssl configuration when it is not provided", async () => {
            const options: PostgreSQLModuleAsyncOptions = {
                useFactory: () => {
                    return {
                        aggregatesTableName: "async-aggregates",
                        connectionUri: "postgres://test:test@docker:32770/db",
                        eventsTableName: "async-events",
                        schemaName: "the-async-schema"
                    };
                }
            };
            await Test.createTestingModule({
                providers: ModuleProviders.createAsync(options)
            }).compile();
            expect(mockedKnex).toHaveBeenCalledWith({
                client: "pg",
                connection: {
                    connectionString: "postgres://test:test@docker:32770/db"
                }
            });
        });

        test("enables ssl when ssl options are provided", async () => {
            const options: PostgreSQLModuleAsyncOptions = {
                useFactory: () => {
                    return {
                        aggregatesTableName: "async-aggregates",
                        connectionUri: "postgres://test:test@docker:32770/db",
                        eventsTableName: "async-events",
                        schemaName: "the-async-schema",
                        ssl: {
                            certificate: "ca-cert",
                            rejectUnauthorized: true
                        }
                    };
                }
            };
            await Test.createTestingModule({
                providers: ModuleProviders.createAsync(options)
            }).compile();
            expect(mockedKnex).toHaveBeenCalledWith({
                client: "pg",
                connection: {
                    connectionString: "postgres://test:test@docker:32770/db",
                    ssl: {
                        ca: "ca-cert",
                        rejectUnauthorized: true
                    }
                }
            });
        });
    });
});
