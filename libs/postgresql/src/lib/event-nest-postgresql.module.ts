import { DynamicModule, Global, Module } from "@nestjs/common";
import { DomainEventEmitter, EVENT_STORE } from "@event-nest/core";
import { ModulesContainer } from "@nestjs/core";
import { PostgreSQLModuleAsyncOptions, PostgreSQLModuleOptions } from "./postgresql-module-options";
import { ModuleProviders } from "./module-providers";

@Global()
@Module({})
export class EventNestPostgreSQLModule {
    constructor(
        private readonly _eventEmitter: DomainEventEmitter,
        private readonly _modulesContainer: ModulesContainer
    ) {}

    static register(options: PostgreSQLModuleOptions): DynamicModule {
        return {
            module: EventNestPostgreSQLModule,
            providers: ModuleProviders.create(options),
            exports: [EVENT_STORE]
        };
    }

    static registerAsync(options: PostgreSQLModuleAsyncOptions): DynamicModule {
        return {
            module: EventNestPostgreSQLModule,
            providers: ModuleProviders.createAsync(options),
            exports: [EVENT_STORE]
        };
    }

    onApplicationBootstrap() {
        this._eventEmitter.bindSubscriptions(this._modulesContainer);
    }
}
