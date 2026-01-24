import { DomainEventEmitter, EVENT_STORE, NoSnapshotStrategy, SnapshotStrategy } from "@event-nest/core";
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
                provide: SnapshotStrategy,
                useFactory: () => options.snapshotStrategy || new NoSnapshotStrategy()
            },
            {
                provide: "EVENT_NEST_MONGO_CLIENT",
                useFactory: () => {
                    return new MongoClient(options.connectionUri, options.mongoClientConfiguration);
                }
            },
            {
                inject: [SnapshotStrategy, "EVENT_NEST_MONGO_CLIENT"],
                provide: MongoSnapshotStore,
                useFactory: (srategy: SnapshotStrategy, mongoClient: MongoClient) => {
                    return new MongoSnapshotStore(srategy, mongoClient, options.snapshotCollection);
                }
            },
            {
                inject: [DomainEventEmitter, "EVENT_NEST_MONGO_CLIENT", MongoSnapshotStore],
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

        const snapshotStrategyProvider = {
            inject: ["EVENT_NEST_OPTIONS", DomainEventEmitter],
            provide: SnapshotStrategy,
            useFactory: (options: MongodbModuleOptions) => options.snapshotStrategy || new NoSnapshotStrategy()
        };

        const snapshotStoreProvider = {
            inject: [SnapshotStrategy, "EVENT_NEST_MONGO_CLIENT", "EVENT_NEST_OPTIONS"],
            provide: MongoSnapshotStore,
            useFactory: (srategy: SnapshotStrategy, mongoClient: MongoClient, options: MongodbModuleOptions) => {
                return new MongoSnapshotStore(srategy, mongoClient, options.snapshotCollection);
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
            inject: ["EVENT_NEST_OPTIONS", DomainEventEmitter, "EVENT_NEST_MONGO_CLIENT", MongoSnapshotStore],
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

        return [
            optionsProvider,
            eventBusProvider,
            eventStoreProvider,
            snapshotStrategyProvider,
            snapshotStoreProvider,
            mongoClientProvider
        ];
    }
}
