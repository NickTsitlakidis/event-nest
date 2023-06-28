import { Provider } from "@nestjs/common";
import { EVENT_STORE } from "@event-nest/core";
import { MongodbModuleSyncOptions } from "../mongodb-module-options";
import { MongoClient } from "mongodb";
import { MongoEventStore } from "./mongo-event-store";

export function provideEventStore(options: MongodbModuleSyncOptions): Provider {
    return {
        provide: EVENT_STORE,
        useFactory: () => {
            const mongoClient = new MongoClient(options.connectionUri);
            return new MongoEventStore(mongoClient, options.aggregatesCollection, options.eventsCollection);
        }
    };
}
