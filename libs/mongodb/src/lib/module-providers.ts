import { Provider } from "@nestjs/common";
import { EVENT_STORE, EventBus } from "@event-nest/core";
import { MongoDbModuleAsyncOptions, MongodbModuleOptions } from "./mongodb-module-options";
import { MongoClient } from "mongodb";
import { MongoEventStore } from "./storage/mongo-event-store";

export function createProviders(options: MongodbModuleOptions): Provider[] {
    return [
        {
            provide: EventBus,
            useFactory: () => {
                return new EventBus(options.runParallelSubscriptions);
            }
        },
        {
            provide: EVENT_STORE,
            useFactory: (eventBus: EventBus) => {
                const mongoClient = new MongoClient(options.connectionUri);
                return new MongoEventStore(
                    eventBus,
                    mongoClient,
                    options.aggregatesCollection,
                    options.eventsCollection
                );
            },
            inject: [EventBus]
        }
    ];
}

export function createAsyncProviders(options: MongoDbModuleAsyncOptions): Provider[] {
    const optionsProvider = {
        provide: "EVENT_NEST_OPTIONS",
        useFactory: async (...args: any[]) => {
            const mongoDbModuleOptions = await options.useFactory(...args);
            return mongoDbModuleOptions;
        },
        inject: options.inject
    };

    const eventBusProvider = {
        provide: EventBus,
        useFactory: (options: MongodbModuleOptions) => {
            return new EventBus(options.runParallelSubscriptions);
        },
        inject: ["EVENT_NEST_OPTIONS"]
    };

    const eventStoreProvider = {
        provide: EVENT_STORE,
        useFactory: (options: MongodbModuleOptions, eventBus: EventBus) => {
            const mongoClient = new MongoClient(options.connectionUri);
            return new MongoEventStore(eventBus, mongoClient, options.aggregatesCollection, options.eventsCollection);
        },
        inject: ["EVENT_NEST_OPTIONS", EventBus]
    };

    return [optionsProvider, eventBusProvider, eventStoreProvider];
}
