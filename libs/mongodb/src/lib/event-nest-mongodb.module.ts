import { DomainEventEmitter, EVENT_STORE } from "@event-nest/core";
import { DynamicModule, Global, Module, OnApplicationBootstrap } from "@nestjs/common";
import { ModulesContainer } from "@nestjs/core";

import { ModuleProviders } from "./module-providers";
import { MongoDbModuleAsyncOptions, MongodbModuleOptions } from "./mongodb-module-options";

@Global()
@Module({})
export class EventNestMongoDbModule implements OnApplicationBootstrap {
    constructor(
        private readonly _eventEmitter: DomainEventEmitter,
        private readonly _modulesContainer: ModulesContainer
    ) {}

    static register(options: MongodbModuleOptions): DynamicModule {
        return {
            exports: [EVENT_STORE],
            module: EventNestMongoDbModule,
            providers: ModuleProviders.create(options)
        };
    }

    static registerAsync(options: MongoDbModuleAsyncOptions): DynamicModule {
        return {
            exports: [EVENT_STORE],
            module: EventNestMongoDbModule,
            providers: ModuleProviders.createAsync(options)
        };
    }

    onApplicationBootstrap() {
        this._eventEmitter.bindSubscriptions(this._modulesContainer);
    }
}
