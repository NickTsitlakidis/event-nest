import { DynamicModule, Global, Module, OnApplicationBootstrap } from "@nestjs/common";
import { MongoDbModuleAsyncOptions, MongodbModuleOptions } from "./mongodb-module-options";
import { EVENT_STORE, DomainEventEmitter } from "@event-nest/core";
import { ModulesContainer } from "@nestjs/core";
import { ModuleProviders } from "./module-providers";

@Global()
@Module({})
export class EventNestMongoDbModule implements OnApplicationBootstrap {
    constructor(
        private readonly _eventEmitter: DomainEventEmitter,
        private readonly _modulesContainer: ModulesContainer
    ) {}

    static register(options: MongodbModuleOptions): DynamicModule {
        return {
            module: EventNestMongoDbModule,
            providers: ModuleProviders.create(options),
            exports: [EVENT_STORE]
        };
    }

    static registerAsync(options: MongoDbModuleAsyncOptions): DynamicModule {
        return {
            module: EventNestMongoDbModule,
            providers: ModuleProviders.createAsync(options),
            exports: [EVENT_STORE]
        };
    }

    onApplicationBootstrap() {
        this._eventEmitter.bindSubscriptions(this._modulesContainer);
    }
}
