import { Provider } from "@nestjs/common";
import { EVENT_STORE, EventBus } from "@event-nest/core";
import { MongoDbModuleAsyncOptions, MongodbModuleOptions } from "../mongodb-module-options";
import { MongoClient } from "mongodb";
import { MongoEventStore } from "./mongo-event-store";

export function provideEventStore(options: MongodbModuleOptions): Provider {
    return {
        provide: EVENT_STORE,
        useFactory: (eventBus: EventBus) => {
            const mongoClient = new MongoClient(options.connectionUri);
            return new MongoEventStore(eventBus, mongoClient, options.aggregatesCollection, options.eventsCollection);
        },
        inject: [EventBus]
    };
}

export function provideEventStoreAsync(options: MongoDbModuleAsyncOptions): Provider {
    return {
        provide: EVENT_STORE,
        useFactory: async (...args: any[]) => {
            const mongoDbModuleOptions = await options.useFactory(...args);
            const mongoClient = new MongoClient(mongoDbModuleOptions.connectionUri);
            return new MongoEventStore(
                args[0], //todo this needs an event bus injection
                mongoClient,
                mongoDbModuleOptions.aggregatesCollection,
                mongoDbModuleOptions.eventsCollection
            );
        },
        inject: options.inject
    };
}
