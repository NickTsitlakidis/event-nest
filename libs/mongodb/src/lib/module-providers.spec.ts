import {
    DomainEventEmitter,
    EVENT_STORE,
    NoOpSnapshotStore,
    NoSnapshotStrategy,
    SNAPSHOT_STORE
} from "@event-nest/core";
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
import { MongoSnapshotStore } from "./storage/mongo-snapshot-store";

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

    test("throws when only snapshotStrategy is provided, but no snapshotCollection", async () => {
        const customStrategy = new NoSnapshotStrategy();
        //@ts-expect-error no snapshotStrategy
        const options: MongodbModuleOptions = {
            aggregatesCollection: "aggregates",
            connectionUri: "mongodb://localhost:27017",
            eventsCollection: "events",
            snapshotStrategy: customStrategy
        };

        expect(() =>
            Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile()
        ).rejects.toThrow();
    });

    test("provides NoOpSnapshotStore when no snapshotStrategy and no snapshotCollection", async () => {
        const options: MongodbModuleOptions = {
            aggregatesCollection: "aggregates",
            connectionUri: "mongodb://localhost:27017",
            eventsCollection: "events"
        };

        const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
        expect(module.get(SNAPSHOT_STORE)).toBeInstanceOf(NoOpSnapshotStore);
    });

    test("throws when only snapshotCollection is provided, but no snapshotStrategy", async () => {
        //@ts-expect-error no snapshotCollection
        const options: MongodbModuleOptions = {
            aggregatesCollection: "aggregates",
            connectionUri: "mongodb://localhost:27017",
            eventsCollection: "events",
            snapshotCollection: "snapshots"
        };

        expect(() =>
            Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile()
        ).rejects.toThrow();
    });

    test("creates MongoSnapshotStore provider", async () => {
        const options: MongodbModuleOptions = {
            aggregatesCollection: "aggregates",
            connectionUri: "mongodb://localhost:27017",
            eventsCollection: "events",
            snapshotCollection: "snapshots",
            snapshotStrategy: new NoSnapshotStrategy()
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
        const snapshotStore: MongoSnapshotStore = module.get(SNAPSHOT_STORE);
        expect(snapshotStore).toBeDefined();
        expect(snapshotStore).toBeInstanceOf(MongoSnapshotStore);
    });

    test("creates MongoClient provider", async () => {
        const options: MongodbModuleOptions = {
            aggregatesCollection: "aggregates",
            connectionUri: "mongodb://localhost:27017",
            eventsCollection: "events"
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();
        const mongoClient: MongoClient = module.get("EVENT_NEST_MONGO_CLIENT");
        expect(mongoClient).toBeDefined();
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

    test("throws when no snapshotCollection is provided, but strategy provided", async () => {
        const options: MongoDbModuleAsyncOptions = {
            //@ts-expect-error no snapshotCollection
            useFactory: () => {
                return {
                    aggregatesCollection: "async-aggregates",
                    connectionUri: "mongodb://localhost:27017",
                    eventsCollection: "async-events",
                    snapshotStrategy: new NoSnapshotStrategy()
                };
            }
        };
        expect(() =>
            Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile()
        ).rejects.toThrow();
    });

    test("throws when no strategy is provided, but snapshotCollection is provided", async () => {
        const options: MongoDbModuleAsyncOptions = {
            //@ts-expect-error no strategy
            useFactory: () => {
                return {
                    aggregatesCollection: "async-aggregates",
                    connectionUri: "mongodb://localhost:27017",
                    eventsCollection: "async-events",
                    snapshotCollection: "async-snapshots"
                };
            }
        };
        expect(() =>
            Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile()
        ).rejects.toThrow();
    });

    test("creates MongoSnapshotStore provider when options is Promise", async () => {
        const options: MongoDbModuleAsyncOptions = {
            useFactory: () => {
                return Promise.resolve({
                    aggregatesCollection: "async-aggregates",
                    connectionUri: "mongodb://localhost:27017",
                    eventsCollection: "async-events",
                    snapshotCollection: "async-snapshots",
                    snapshotStrategy: new NoSnapshotStrategy()
                });
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const snapshotStore: MongoSnapshotStore = module.get(SNAPSHOT_STORE);
        expect(snapshotStore).toBeDefined();
        expect(snapshotStore).toBeInstanceOf(MongoSnapshotStore);
    });

    test("creates MongoSnapshotStore provider when options is object", async () => {
        const options: MongoDbModuleAsyncOptions = {
            useFactory: () => {
                return {
                    aggregatesCollection: "async-aggregates",
                    connectionUri: "mongodb://localhost:27017",
                    eventsCollection: "async-events",
                    snapshotCollection: "async-snapshots",
                    snapshotStrategy: new NoSnapshotStrategy()
                };
            }
        };
        const module = await Test.createTestingModule({ providers: ModuleProviders.createAsync(options) }).compile();
        const snapshotStore: MongoSnapshotStore = module.get(SNAPSHOT_STORE);
        expect(snapshotStore).toBeDefined();
        expect(snapshotStore).toBeInstanceOf(MongoSnapshotStore);
    });

    test("creates NoOpSnapshotStore provider when no snapshotCollection and no snapshotStrategy", async () => {
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
        const snapshotStore: MongoSnapshotStore = module.get(SNAPSHOT_STORE);
        expect(snapshotStore).toBeDefined();
        expect(snapshotStore).toBeInstanceOf(NoOpSnapshotStore);
    });

    test("creates MongoClient provider when options is Promise", async () => {
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
        const mongoClient: MongoClient = module.get("EVENT_NEST_MONGO_CLIENT");
        expect(mongoClient).toBeDefined();
        expect(MongoClient).toHaveBeenCalledTimes(1);
        expect(MongoClient).toHaveBeenCalledWith("mongodb://localhost:27017", undefined);
    });

    test("creates MongoClient provider when options is object", async () => {
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
        const mongoClient: MongoClient = module.get("EVENT_NEST_MONGO_CLIENT");
        expect(mongoClient).toBeDefined();
        expect(MongoClient).toHaveBeenCalledTimes(1);
        expect(MongoClient).toHaveBeenCalledWith("mongodb://localhost:27017", undefined);
    });
});
