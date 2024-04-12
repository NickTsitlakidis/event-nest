import { DomainEventEmitter, EVENT_STORE } from "@event-nest/core";
import { DynamicModule, Global, Module } from "@nestjs/common";
import { ModulesContainer } from "@nestjs/core";

import { ModuleProviders } from "./module-providers";
import { PostgreSQLModuleAsyncOptions, PostgreSQLModuleOptions } from "./postgresql-module-options";

@Global()
@Module({})
export class EventNestPostgreSQLModule {
    constructor(
        private readonly _eventEmitter: DomainEventEmitter,
        private readonly _modulesContainer: ModulesContainer
    ) {}

    static register(options: PostgreSQLModuleOptions): DynamicModule {
        return {
            exports: [EVENT_STORE],
            module: EventNestPostgreSQLModule,
            providers: ModuleProviders.create(options)
        };
    }

    static registerAsync(options: PostgreSQLModuleAsyncOptions): DynamicModule {
        return {
            exports: [EVENT_STORE],
            module: EventNestPostgreSQLModule,
            providers: ModuleProviders.createAsync(options)
        };
    }

    onApplicationBootstrap() {
        this._eventEmitter.bindSubscriptions(this._modulesContainer);
    }
}
