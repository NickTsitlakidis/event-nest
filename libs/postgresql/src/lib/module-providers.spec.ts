import { Test } from "@nestjs/testing";
import { DomainEventEmitter, EVENT_STORE } from "@event-nest/core";
import { ModuleProviders } from "./module-providers";
import { PostgreSQLModuleAsyncOptions, PostgreSQLModuleOptions } from "./postgresql-module-options";
import { PostgreSQLEventStore } from "./storage/postgresql-event-store";

describe("create - tests", () => {
    test("creates PostgresqlEventStore provider", async () => {
        const options: PostgreSQLModuleOptions = {
            connectionUri: "postgres://test:test@docker:32770/db",
            aggregatesTableName: "aggregates",
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
            connectionUri: "postgres://test:test@docker:32770/db",
            aggregatesTableName: "aggregates",
            eventsTableName: "events",
            schemaName: "the-schema",
            concurrentSubscriptions: true
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.concurrentSubscriptions).toBe(options.concurrentSubscriptions);
    });

    test("creates DomainEventEmitter provider without concurrent option", async () => {
        const options: PostgreSQLModuleOptions = {
            connectionUri: "postgres://test:test@docker:32770/db",
            aggregatesTableName: "aggregates",
            eventsTableName: "events",
            schemaName: "the-schema"
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.concurrentSubscriptions).toBe(false);
    });
});

describe("createAsync - tests", () => {
    test("creates PostgreSQLEventStore provider when options is Promise", async () => {
        const options: PostgreSQLModuleAsyncOptions = {
            useFactory: () => {
                return Promise.resolve({
                    connectionUri: "postgres://test:test@docker:32770/db",
                    aggregatesTableName: "async-aggregates",
                    eventsTableName: "async-events",
                    schemaName: "the-async-schema"
                });
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
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
                    connectionUri: "postgres://test:test@docker:32770/db",
                    aggregatesTableName: "async-aggregates",
                    eventsTableName: "async-events",
                    schemaName: "the-async-schema"
                };
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
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
                    connectionUri: "postgres://test:test@docker:32770/db",
                    aggregatesTableName: "async-aggregates",
                    eventsTableName: "async-events",
                    schemaName: "the-async-schema",
                    concurrentSubscriptions: true
                });
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.concurrentSubscriptions).toBe(true);
    });

    test("creates DomainEventEmitter provider with concurrent option when options is object", async () => {
        const options: PostgreSQLModuleAsyncOptions = {
            useFactory: () => {
                return {
                    connectionUri: "postgres://test:test@docker:32770/db",
                    aggregatesTableName: "async-aggregates",
                    eventsTableName: "async-events",
                    schemaName: "the-async-schema",
                    concurrentSubscriptions: true
                };
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.concurrentSubscriptions).toBe(true);
    });

    test("creates DomainEventEmitter provider without concurrent option when options is Promise", async () => {
        const options: PostgreSQLModuleAsyncOptions = {
            useFactory: () => {
                return Promise.resolve({
                    connectionUri: "postgres://test:test@docker:32770/db",
                    aggregatesTableName: "async-aggregates",
                    eventsTableName: "async-events",
                    schemaName: "the-async-schema"
                });
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.concurrentSubscriptions).toBe(false);
    });

    test("creates DomainEventEmitter provider without concurrent option when options is object", async () => {
        const options: PostgreSQLModuleAsyncOptions = {
            useFactory: () => {
                return {
                    connectionUri: "postgres://test:test@docker:32770/db",
                    aggregatesTableName: "async-aggregates",
                    eventsTableName: "async-events",
                    schemaName: "the-async-schema"
                };
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.concurrentSubscriptions).toBe(false);
    });
});
