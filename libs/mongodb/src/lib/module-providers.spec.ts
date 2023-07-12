import { Test } from "@nestjs/testing";
import { MongoDbModuleAsyncOptions, MongodbModuleOptions } from "./mongodb-module-options";
import { DomainEventEmitter, EVENT_STORE } from "@event-nest/core";
import { MongoEventStore } from "./storage/mongo-event-store";
import { ModuleProviders } from "./module-providers";

describe("create - tests", () => {
    test("creates MongoEventStore provider", async () => {
        const options: MongodbModuleOptions = {
            connectionUri: "mongodb://localhost:27017",
            aggregatesCollection: "aggregates",
            eventsCollection: "events"
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
        const eventStore: MongoEventStore = module.get(EVENT_STORE);
        expect(eventStore).toBeDefined();
        expect(eventStore).toBeInstanceOf(MongoEventStore);
        expect(eventStore.eventsCollectionName).toBe(options.eventsCollection);
        expect(eventStore.aggregatesCollectionName).toBe(options.aggregatesCollection);
    });

    test("creates DomainEventEmitter provider with parallel option", async () => {
        const options: MongodbModuleOptions = {
            connectionUri: "mongodb://localhost:27017",
            aggregatesCollection: "aggregates",
            eventsCollection: "events",
            runParallelSubscriptions: true
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.runsParallelSubscriptions).toBe(options.runParallelSubscriptions);
    });

    test("creates DomainEventEmitter provider without parallel option", async () => {
        const options: MongodbModuleOptions = {
            connectionUri: "mongodb://localhost:27017",
            aggregatesCollection: "aggregates",
            eventsCollection: "events"
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.runsParallelSubscriptions).toBe(false);
    });
});

describe("createAsync - tests", () => {
    test("creates MongoEventStore provider when options is Promise", async () => {
        const options: MongoDbModuleAsyncOptions = {
            useFactory: () => {
                return Promise.resolve({
                    connectionUri: "mongodb://localhost:27017",
                    aggregatesCollection: "async-aggregates",
                    eventsCollection: "async-events"
                });
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const eventStore: MongoEventStore = module.get(EVENT_STORE);
        expect(eventStore).toBeDefined();
        expect(eventStore).toBeInstanceOf(MongoEventStore);
        expect(eventStore.eventsCollectionName).toBe("async-events");
        expect(eventStore.aggregatesCollectionName).toBe("async-aggregates");
    });

    test("creates MongoEventStore provider when options is object", async () => {
        const options: MongoDbModuleAsyncOptions = {
            useFactory: () => {
                return {
                    connectionUri: "mongodb://localhost:27017",
                    aggregatesCollection: "async-aggregates",
                    eventsCollection: "async-events"
                };
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const eventStore: MongoEventStore = module.get(EVENT_STORE);
        expect(eventStore).toBeDefined();
        expect(eventStore).toBeInstanceOf(MongoEventStore);
        expect(eventStore.eventsCollectionName).toBe("async-events");
        expect(eventStore.aggregatesCollectionName).toBe("async-aggregates");
    });

    test("creates DomainEventEmitter provider with parallel option when options is Promise", async () => {
        const options: MongoDbModuleAsyncOptions = {
            useFactory: () => {
                return Promise.resolve({
                    connectionUri: "mongodb://localhost:27017",
                    aggregatesCollection: "async-aggregates",
                    eventsCollection: "async-events",
                    runParallelSubscriptions: true
                });
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.runsParallelSubscriptions).toBe(true);
    });

    test("creates DomainEventEmitter provider with parallel option when options is object", async () => {
        const options: MongoDbModuleAsyncOptions = {
            useFactory: () => {
                return {
                    connectionUri: "mongodb://localhost:27017",
                    aggregatesCollection: "async-aggregates",
                    eventsCollection: "async-events",
                    runParallelSubscriptions: true
                };
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.runsParallelSubscriptions).toBe(true);
    });

    test("creates DomainEventEmitter provider without parallel option when options is Promise", async () => {
        const options: MongoDbModuleAsyncOptions = {
            useFactory: () => {
                return Promise.resolve({
                    connectionUri: "mongodb://localhost:27017",
                    aggregatesCollection: "async-aggregates",
                    eventsCollection: "async-events"
                });
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.runsParallelSubscriptions).toBe(false);
    });

    test("creates DomainEventEmitter provider without parallel option when options is object", async () => {
        const options: MongoDbModuleAsyncOptions = {
            useFactory: () => {
                return {
                    connectionUri: "mongodb://localhost:27017",
                    aggregatesCollection: "async-aggregates",
                    eventsCollection: "async-events"
                };
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.runsParallelSubscriptions).toBe(false);
    });
});
