import { DomainEventEmitter, EVENT_STORE } from "@event-nest/core";
import { DynamicModule, Inject, Module, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { ModulesContainer } from "@nestjs/core";
import { Knex } from "knex";

import { KNEX_CONNECTION, ModuleProviders } from "./module-providers";
import { MSSQLModuleAsyncOptions, MSSQLModuleOptions } from "./mssql-module-options";

@Module({})
export class EventNestMSSQLModule implements OnApplicationBootstrap, OnApplicationShutdown {
    constructor(
        private readonly _eventEmitter: DomainEventEmitter,
        private readonly _modulesContainer: ModulesContainer,
        @Inject(KNEX_CONNECTION) private readonly _knexConnection: Knex
    ) {}

    private static createDynamicModule(providers: DynamicModule["providers"], isGlobal: boolean): DynamicModule {
        return {
            exports: [EVENT_STORE],
            global: isGlobal,
            module: this,
            providers
        };
    }

    /**
     * Registers the event-nest module globally with the provided options. The exported providers will be available
     * across the application without having to import the module more than once.
     * @param options The options to configure the MSSQL connection.
     */
    static forRoot(options: MSSQLModuleOptions): DynamicModule {
        return this.createDynamicModule(ModuleProviders.create(options), true);
    }

    /**
     * Registers the event-nest module globally with the provided options. The exported providers will be available
     * across the application without having to import the module more than once.
     * @param options An options object which includes the factory that should be called to resolve the final module options.
     */
    static forRootAsync(options: MSSQLModuleAsyncOptions): DynamicModule {
        return this.createDynamicModule(ModuleProviders.createAsync(options), true);
    }

    /**
     * Registers the event-nest module with the provided options. The exported providers will be available only for the
     * module that imports this module.
     * @param options The options to configure the MSSQL connection.
     */
    static register(options: MSSQLModuleOptions): DynamicModule {
        return this.createDynamicModule(ModuleProviders.create(options), false);
    }

    /**
     * Registers the event-nest module with the provided options. The exported providers will be available only for the
     * module that imports this module.
     * @param options An options object which includes the factory that should be called to resolve the final module options.
     */
    static registerAsync(options: MSSQLModuleAsyncOptions): DynamicModule {
        return this.createDynamicModule(ModuleProviders.createAsync(options), false);
    }

    onApplicationBootstrap(): void {
        this._eventEmitter.bindSubscriptions(this._modulesContainer);
    }

    async onApplicationShutdown(): Promise<void> {
        await this._knexConnection.destroy();
    }
}
