import { DomainEventEmitter, EVENT_STORE } from "@event-nest/core";
import { DynamicModule, Module, OnApplicationBootstrap } from "@nestjs/common";
import { ModulesContainer } from "@nestjs/core";

import { ModuleProviders } from "./module-providers";
import { MySQLModuleAsyncOptions, MySQLModuleOptions } from "./mysql-module-options";

@Module({})
export class EventNestMySQLModule implements OnApplicationBootstrap {
    constructor(
        private readonly _eventEmitter: DomainEventEmitter,
        private readonly _modulesContainer: ModulesContainer
    ) {}

    /**
     * Registers the event-nest module globally with the provided options. The exported providers will be available
     * across the application without having to import the module more than once.
     * @param options The options to configure the MySQL connection.
     */
    static forRoot(options: MySQLModuleOptions): DynamicModule {
        return {
            exports: [EVENT_STORE],
            global: true,
            module: EventNestMySQLModule,
            providers: ModuleProviders.create(options)
        };
    }

    /**
     * Registers the event-nest module globally with the provided options. The exported providers will be available
     * across the application without having to import the module more than once.
     * @param options An options object which includes the factory that should be called to resolve the final module options.
     */
    static forRootAsync(options: MySQLModuleAsyncOptions): DynamicModule {
        return {
            exports: [EVENT_STORE],
            global: true,
            module: EventNestMySQLModule,
            providers: ModuleProviders.createAsync(options)
        };
    }

    /**
     * Registers the event-nest module with the provided options. The exported providers will be available only for the
     * module that imports this module.
     * @param options The options to configure the MySQL connection.
     */
    static register(options: MySQLModuleOptions): DynamicModule {
        return {
            exports: [EVENT_STORE],
            global: false,
            module: EventNestMySQLModule,
            providers: ModuleProviders.create(options)
        };
    }

    /**
     * Registers the event-nest module with the provided options. The exported providers will be available only for the
     * module that imports this module.
     * @param options An options object which includes the factory that should be called to resolve the final module options.
     */
    static registerAsync(options: MySQLModuleAsyncOptions): DynamicModule {
        return {
            exports: [EVENT_STORE],
            global: false,
            module: EventNestMySQLModule,
            providers: ModuleProviders.createAsync(options)
        };
    }

    onApplicationBootstrap() {
        this._eventEmitter.bindSubscriptions(this._modulesContainer);
    }
}
