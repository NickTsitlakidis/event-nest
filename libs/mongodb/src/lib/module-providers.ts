import { Provider } from "@nestjs/common";
import { EVENT_STORE, DomainEventEmitter } from "@event-nest/core";
import { MongoDbModuleAsyncOptions, MongodbModuleOptions } from "./mongodb-module-options";
import { MongoClient } from "mongodb";
import { MongoEventStore } from "./storage/mongo-event-store";

export function createProviders(options: MongodbModuleOptions): Provider[] {
    return [
        {
            provide: DomainEventEmitter,
            useFactory: () => {
                return new DomainEventEmitter(options.runParallelSubscriptions);
            }
        },
        {
            provide: EVENT_STORE,
            useFactory: (eventBus: DomainEventEmitter) => {
                const mongoClient = new MongoClient(options.connectionUri);
                return new MongoEventStore(
                    eventBus,
                    mongoClient,
                    options.aggregatesCollection,
                    options.eventsCollection
                );
            },
            inject: [DomainEventEmitter]
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
        provide: DomainEventEmitter,
        useFactory: (options: MongodbModuleOptions) => {
            return new DomainEventEmitter(options.runParallelSubscriptions);
        },
        inject: ["EVENT_NEST_OPTIONS"]
    };

    const eventStoreProvider = {
        provide: EVENT_STORE,
        useFactory: (options: MongodbModuleOptions, eventBus: DomainEventEmitter) => {
            const mongoClient = new MongoClient(options.connectionUri);
            return new MongoEventStore(eventBus, mongoClient, options.aggregatesCollection, options.eventsCollection);
        },
        inject: ["EVENT_NEST_OPTIONS", DomainEventEmitter]
    };

    return [optionsProvider, eventBusProvider, eventStoreProvider];
}