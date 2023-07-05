import { DynamicModule, Global, Module, OnApplicationBootstrap } from "@nestjs/common";
import { MongoDbModuleAsyncOptions, MongodbModuleOptions } from "./mongodb-module-options";
import { provideEventStore, provideEventStoreAsync } from "./storage/event-store-provider";
import { EVENT_STORE, EventBus, provideEventBus } from "@event-nest/core";
import { ModulesContainer } from "@nestjs/core";

@Global()
@Module({})
export class EventNestMongoDbModule implements OnApplicationBootstrap {
    constructor(private readonly _eventBus: EventBus, private readonly _modulesContainer: ModulesContainer) {}

    static register(options: MongodbModuleOptions): DynamicModule {
        return {
            module: EventNestMongoDbModule,
            providers: [provideEventStore(options), provideEventBus(options)],
            exports: [EVENT_STORE]
        };
    }

    static registerAsync(options: MongoDbModuleAsyncOptions): DynamicModule {
        return {
            module: EventNestMongoDbModule,
            providers: provideEventStoreAsync(options),
            exports: [EVENT_STORE]
        };
    }

    onApplicationBootstrap(): any {
        this._eventBus.bindSubscriptions(this._modulesContainer);
    }
}
