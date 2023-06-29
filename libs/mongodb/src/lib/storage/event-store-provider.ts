import { Provider } from "@nestjs/common";
import { EVENT_STORE } from "@event-nest/core";
import { MongoDbModuleAsyncOptions, MongodbModuleOptions } from "../mongodb-module-options";
import { MongoClient } from "mongodb";
import { MongoEventStore } from "./mongo-event-store";

export function provideEventStore(options: MongodbModuleOptions): Provider {
    return {
        provide: EVENT_STORE,
        useFactory: () => {
            const mongoClient = new MongoClient(options.connectionUri);
            return new MongoEventStore(mongoClient, options.aggregatesCollection, options.eventsCollection);
        }
    };
}

export function provideEventStoreAsync(options: MongoDbModuleAsyncOptions): Provider {
    return {
        provide: EVENT_STORE,
        useFactory: async (...args: any[]) => {
            const mongoDbModuleOptions = await options.useFactory(...args);
            const mongoClient = new MongoClient(mongoDbModuleOptions.connectionUri);
            return new MongoEventStore(
                mongoClient,
                mongoDbModuleOptions.aggregatesCollection,
                mongoDbModuleOptions.eventsCollection
            );
        },
        inject: options.inject
    };
}
