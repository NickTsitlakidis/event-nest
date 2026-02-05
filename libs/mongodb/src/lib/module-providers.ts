import {
    AbstractSnapshotStore,
    DomainEventEmitter,
    EVENT_STORE,
    NoOpSnapshotStore,
    SNAPSHOT_STORE
} from "@event-nest/core";
import { Provider } from "@nestjs/common";
import { MongoClient } from "mongodb";

// eslint-disable-next-line unicorn/prevent-abbreviations
import { MongoDbModuleAsyncOptions, MongodbModuleOptions } from "./mongodb-module-options";
import { MongoEventStore } from "./storage/mongo-event-store";
import { MongoSnapshotStore } from "./storage/mongo-snapshot-store";

export class ModuleProviders {
    static create(options: MongodbModuleOptions): Provider[] {
        return [
            {
                provide: DomainEventEmitter,
                useFactory: () => {
                    return new DomainEventEmitter(options.concurrentSubscriptions);
                }
            },
            {
                provide: "EVENT_NEST_MONGO_CLIENT",
                useFactory: () => {
                    return new MongoClient(options.connectionUri, options.mongoClientConfiguration);
                }
            },
            {
                inject: ["EVENT_NEST_MONGO_CLIENT"],
                provide: SNAPSHOT_STORE,
                useFactory: (mongoClient: MongoClient) => {
                    const { snapshotCollection, snapshotStrategy } = options;
                    if (Boolean(snapshotStrategy) !== Boolean(snapshotCollection)) {
                        throw new Error(
                            "To use snapshots, both 'snapshotStrategy' and 'snapshotCollection' must be provided."
                        );
                    }

                    if (!snapshotCollection || !snapshotStrategy) {
                        return new NoOpSnapshotStore();
                    }

                    return new MongoSnapshotStore(snapshotStrategy, mongoClient, snapshotCollection);
                }
            },
            {
                inject: [DomainEventEmitter, "EVENT_NEST_MONGO_CLIENT", SNAPSHOT_STORE],
                provide: EVENT_STORE,
                useFactory: (
                    eventEmitter: DomainEventEmitter,
                    mongoClient: MongoClient,
                    snapshotStore: MongoSnapshotStore
                ) => {
                    return new MongoEventStore(
                        eventEmitter,
                        snapshotStore,
                        mongoClient,
                        options.aggregatesCollection,
                        options.eventsCollection
                    );
                }
            }
        ];
    }

    static createAsync(options: MongoDbModuleAsyncOptions): Provider[] {
        const mongoClientProvider = {
            inject: ["EVENT_NEST_OPTIONS"],
            provide: "EVENT_NEST_MONGO_CLIENT",
            useFactory: (options: MongodbModuleOptions) => {
                return new MongoClient(options.connectionUri, options.mongoClientConfiguration);
            }
        };

        const snapshotStoreProvider = {
            inject: ["EVENT_NEST_MONGO_CLIENT", "EVENT_NEST_OPTIONS"],
            provide: SNAPSHOT_STORE,
            useFactory: (mongoClient: MongoClient, options: MongodbModuleOptions): AbstractSnapshotStore => {
                const { snapshotCollection, snapshotStrategy } = options;
                if (Boolean(snapshotStrategy) !== Boolean(snapshotCollection)) {
                    throw new Error(
                        "To use snapshots, both 'snapshotStrategy' and 'snapshotCollection' must be provided."
                    );
                }

                if (!snapshotCollection || !snapshotStrategy) {
                    return new NoOpSnapshotStore();
                }

                return new MongoSnapshotStore(snapshotStrategy, mongoClient, snapshotCollection);
            }
        };

        const optionsProvider = {
            inject: options.inject,
            provide: "EVENT_NEST_OPTIONS",
            useFactory: async (...parameters: unknown[]) => {
                return await options.useFactory(...parameters);
            }
        };

        const eventBusProvider = {
            inject: ["EVENT_NEST_OPTIONS"],
            provide: DomainEventEmitter,
            useFactory: (options: MongodbModuleOptions) => {
                return new DomainEventEmitter(options.concurrentSubscriptions);
            }
        };

        const eventStoreProvider = {
            inject: ["EVENT_NEST_OPTIONS", DomainEventEmitter, "EVENT_NEST_MONGO_CLIENT", SNAPSHOT_STORE],
            provide: EVENT_STORE,
            useFactory: (
                options: MongodbModuleOptions,
                eventBus: DomainEventEmitter,
                mongoClient: MongoClient,
                snapshotStore: MongoSnapshotStore
            ) => {
                return new MongoEventStore(
                    eventBus,
                    snapshotStore,
                    mongoClient,
                    options.aggregatesCollection,
                    options.eventsCollection
                );
            }
        };

        return [optionsProvider, eventBusProvider, eventStoreProvider, snapshotStoreProvider, mongoClientProvider];
    }
}
