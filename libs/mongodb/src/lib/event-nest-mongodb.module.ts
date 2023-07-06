import { DynamicModule, Global, Module, OnApplicationBootstrap } from "@nestjs/common";
import { MongoDbModuleAsyncOptions, MongodbModuleOptions } from "./mongodb-module-options";
import { EVENT_STORE, EventBus } from "@event-nest/core";
import { ModulesContainer } from "@nestjs/core";
import { createAsyncProviders, createProviders } from "./module-providers";

@Global()
@Module({})
export class EventNestMongoDbModule implements OnApplicationBootstrap {
    constructor(private readonly _eventBus: EventBus, private readonly _modulesContainer: ModulesContainer) {}

    static register(options: MongodbModuleOptions): DynamicModule {
        return {
            module: EventNestMongoDbModule,
            providers: createProviders(options),
            exports: [EVENT_STORE]
        };
    }

    static registerAsync(options: MongoDbModuleAsyncOptions): DynamicModule {
        return {
            module: EventNestMongoDbModule,
            providers: createAsyncProviders(options),
            exports: [EVENT_STORE]
        };
    }

    onApplicationBootstrap(): any {
        this._eventBus.bindSubscriptions(this._modulesContainer);
    }
}
