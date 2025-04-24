import { DomainEventEmitter, EVENT_STORE } from "@event-nest/core";
import { Test } from "@nestjs/testing";
import { MongoClient } from "mongodb";

jest.mock("mongodb", () => {
    const originalModule = jest.requireActual("mongodb");

    const mockMongoClient = jest.fn().mockImplementation(() => {
        return {
            close: jest.fn(),
            connect: jest.fn(),
            db: jest.fn(),
            startSession: jest.fn()
        };
    });

    return {
        ...originalModule,
        MongoClient: mockMongoClient
    };
});

import { ModuleProviders } from "./module-providers";
import { MongoDbModuleAsyncOptions, MongodbModuleOptions } from "./mongodb-module-options";
import { MongoEventStore } from "./storage/mongo-event-store";

describe("create", () => {
    test("creates MongoEventStore provider without options", async () => {
        const options: MongodbModuleOptions = {
            aggregatesCollection: "aggregates",
            connectionUri: "mongodb://localhost:27017",
            eventsCollection: "events"
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
        const eventStore: MongoEventStore = module.get(EVENT_STORE);
        expect(eventStore).toBeDefined();
        expect(eventStore).toBeInstanceOf(MongoEventStore);
        expect(eventStore.eventsCollectionName).toBe(options.eventsCollection);
        expect(eventStore.aggregatesCollectionName).toBe(options.aggregatesCollection);
        expect(MongoClient).toHaveBeenCalledTimes(1);
        expect(MongoClient).toHaveBeenCalledWith("mongodb://localhost:27017", undefined);
    });

    test("creates MongoEventStore provider with options", async () => {
        const options: MongodbModuleOptions = {
            aggregatesCollection: "aggregates",
            connectionUri: "mongodb://localhost:27017",
            eventsCollection: "events",
            mongoClientConfiguration: {
                maxPoolSize: 20,
                replicaSet: "replica"
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
        const eventStore: MongoEventStore = module.get(EVENT_STORE);
        expect(eventStore).toBeDefined();
        expect(eventStore).toBeInstanceOf(MongoEventStore);
        expect(eventStore.eventsCollectionName).toBe(options.eventsCollection);
        expect(eventStore.aggregatesCollectionName).toBe(options.aggregatesCollection);
        expect(MongoClient).toHaveBeenCalledTimes(1);
        expect(MongoClient).toHaveBeenCalledWith("mongodb://localhost:27017", {
            maxPoolSize: 20,
            replicaSet: "replica"
        });
    });

    test("creates DomainEventEmitter provider with concurrent option", async () => {
        const options: MongodbModuleOptions = {
            aggregatesCollection: "aggregates",
            concurrentSubscriptions: true,
            connectionUri: "mongodb://localhost:27017",
            eventsCollection: "events"
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.concurrentSubscriptions).toBe(options.concurrentSubscriptions);
        expect(MongoClient).toHaveBeenCalledTimes(1);
        expect(MongoClient).toHaveBeenCalledWith("mongodb://localhost:27017", undefined);
    });

    test("creates DomainEventEmitter provider without concurrent option", async () => {
        const options: MongodbModuleOptions = {
            aggregatesCollection: "aggregates",
            connectionUri: "mongodb://localhost:27017",
            eventsCollection: "events"
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.concurrentSubscriptions).toBe(false);
        expect(MongoClient).toHaveBeenCalledTimes(1);
        expect(MongoClient).toHaveBeenCalledWith("mongodb://localhost:27017", undefined);
    });
});

describe("createAsync", () => {
    test("creates MongoEventStore provider without mongo options when options is Promise", async () => {
        const options: MongoDbModuleAsyncOptions = {
            useFactory: () => {
                return Promise.resolve({
                    aggregatesCollection: "async-aggregates",
                    connectionUri: "mongodb://localhost:27017",
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
        expect(MongoClient).toHaveBeenCalledTimes(1);
        expect(MongoClient).toHaveBeenCalledWith("mongodb://localhost:27017", undefined);
    });

    test("creates MongoEventStore provider with mongo options when options is object", async () => {
        const options: MongoDbModuleAsyncOptions = {
            useFactory: () => {
                return {
                    aggregatesCollection: "async-aggregates",
                    connectionUri: "mongodb://localhost:27017",
                    eventsCollection: "async-events",
                    mongoClientConfiguration: {
                        maxPoolSize: 20,
                        replicaSet: "replica"
                    }
                };
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const eventStore: MongoEventStore = module.get(EVENT_STORE);
        expect(eventStore).toBeDefined();
        expect(eventStore).toBeInstanceOf(MongoEventStore);
        expect(eventStore.eventsCollectionName).toBe("async-events");
        expect(eventStore.aggregatesCollectionName).toBe("async-aggregates");
        expect(MongoClient).toHaveBeenCalledTimes(1);
        expect(MongoClient).toHaveBeenCalledWith("mongodb://localhost:27017", {
            maxPoolSize: 20,
            replicaSet: "replica"
        });
    });

    test("creates DomainEventEmitter provider with concurrent option when options is Promise", async () => {
        const options: MongoDbModuleAsyncOptions = {
            useFactory: () => {
                return Promise.resolve({
                    aggregatesCollection: "async-aggregates",
                    concurrentSubscriptions: true,
                    connectionUri: "mongodb://localhost:27017",
                    eventsCollection: "async-events"
                });
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.concurrentSubscriptions).toBe(true);
        expect(MongoClient).toHaveBeenCalledTimes(1);
        expect(MongoClient).toHaveBeenCalledWith("mongodb://localhost:27017", undefined);
    });

    test("creates DomainEventEmitter provider with concurrent option when options is object", async () => {
        const options: MongoDbModuleAsyncOptions = {
            useFactory: () => {
                return {
                    aggregatesCollection: "async-aggregates",
                    concurrentSubscriptions: true,
                    connectionUri: "mongodb://localhost:27017",
                    eventsCollection: "async-events"
                };
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.concurrentSubscriptions).toBe(true);
        expect(MongoClient).toHaveBeenCalledTimes(1);
        expect(MongoClient).toHaveBeenCalledWith("mongodb://localhost:27017", undefined);
    });

    test("creates DomainEventEmitter provider without concurrent option when options is Promise", async () => {
        const options: MongoDbModuleAsyncOptions = {
            useFactory: () => {
                return Promise.resolve({
                    aggregatesCollection: "async-aggregates",
                    connectionUri: "mongodb://localhost:27017",
                    eventsCollection: "async-events"
                });
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.concurrentSubscriptions).toBe(false);
        expect(MongoClient).toHaveBeenCalledTimes(1);
        expect(MongoClient).toHaveBeenCalledWith("mongodb://localhost:27017", undefined);
    });

    test("creates DomainEventEmitter provider without concurrent option when options is object", async () => {
        const options: MongoDbModuleAsyncOptions = {
            useFactory: () => {
                return {
                    aggregatesCollection: "async-aggregates",
                    connectionUri: "mongodb://localhost:27017",
                    eventsCollection: "async-events"
                };
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const emitter: DomainEventEmitter = module.get(DomainEventEmitter);
        expect(emitter).toBeDefined();
        expect(emitter).toBeInstanceOf(DomainEventEmitter);
        expect(emitter.concurrentSubscriptions).toBe(false);
        expect(MongoClient).toHaveBeenCalledTimes(1);
        expect(MongoClient).toHaveBeenCalledWith("mongodb://localhost:27017", undefined);
    });
});
