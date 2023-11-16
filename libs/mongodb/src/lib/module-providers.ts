import { Provider } from "@nestjs/common";
import { EVENT_STORE, DomainEventEmitter } from "@event-nest/core";
import { MongoDbModuleAsyncOptions, MongodbModuleOptions } from "./mongodb-module-options";
import { MongoClient } from "mongodb";
import { MongoEventStore } from "./storage/mongo-event-store";

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
                provide: EVENT_STORE,
                useFactory: (eventEmitter: DomainEventEmitter) => {
                    return new MongoEventStore(
                        eventEmitter,
                        new MongoClient(options.connectionUri),
                        options.aggregatesCollection,
                        options.eventsCollection
                    );
                },
                inject: [DomainEventEmitter]
            }
        ];
    }

    static createAsync(options: MongoDbModuleAsyncOptions): Provider[] {
        const optionsProvider = {
            provide: "EVENT_NEST_OPTIONS",
            useFactory: async (...args: unknown[]) => {
                const mongoDbModuleOptions = await options.useFactory(...args);
                return mongoDbModuleOptions;
            },
            inject: options.inject
        };

        const eventBusProvider = {
            provide: DomainEventEmitter,
            useFactory: (options: MongodbModuleOptions) => {
                return new DomainEventEmitter(options.concurrentSubscriptions);
            },
            inject: ["EVENT_NEST_OPTIONS"]
        };

        const eventStoreProvider = {
            provide: EVENT_STORE,
            useFactory: (options: MongodbModuleOptions, eventBus: DomainEventEmitter) => {
                const mongoClient = new MongoClient(options.connectionUri);
                return new MongoEventStore(
                    eventBus,
                    mongoClient,
                    options.aggregatesCollection,
                    options.eventsCollection
                );
            },
            inject: ["EVENT_NEST_OPTIONS", DomainEventEmitter]
        };

        return [optionsProvider, eventBusProvider, eventStoreProvider];
    }
}
