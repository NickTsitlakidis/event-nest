import { DomainEventEmitter, EVENT_STORE } from "@event-nest/core";
import { Provider } from "@nestjs/common";
import { MongoClient } from "mongodb";

// eslint-disable-next-line unicorn/prevent-abbreviations
import { MongoDbModuleAsyncOptions, MongodbModuleOptions } from "./mongodb-module-options";
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
                inject: [DomainEventEmitter],
                provide: EVENT_STORE,
                useFactory: (eventEmitter: DomainEventEmitter) => {
                    return new MongoEventStore(
                        eventEmitter,
                        new MongoClient(options.connectionUri),
                        options.aggregatesCollection,
                        options.eventsCollection
                    );
                }
            }
        ];
    }

    static createAsync(options: MongoDbModuleAsyncOptions): Provider[] {
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
            inject: ["EVENT_NEST_OPTIONS", DomainEventEmitter],
            provide: EVENT_STORE,
            useFactory: (options: MongodbModuleOptions, eventBus: DomainEventEmitter) => {
                const mongoClient = new MongoClient(options.connectionUri);
                return new MongoEventStore(
                    eventBus,
                    mongoClient,
                    options.aggregatesCollection,
                    options.eventsCollection
                );
            }
        };

        return [optionsProvider, eventBusProvider, eventStoreProvider];
    }
}
