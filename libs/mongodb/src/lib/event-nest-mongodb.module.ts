import { DynamicModule, Global, Module } from "@nestjs/common";
import { MongoDbModuleAsyncOptions, MongodbModuleOptions } from "./mongodb-module-options";
import { provideEventStore, provideEventStoreAsync } from "./storage/event-store-provider";
import { EVENT_STORE } from "@event-nest/core";

@Global()
@Module({})
export class EventNestMongoDbModule {
    static register(options: MongodbModuleOptions): DynamicModule {
        return {
            module: EventNestMongoDbModule,
            providers: [provideEventStore(options)],
            exports: [EVENT_STORE]
        };
    }

    static registerAsync(options: MongoDbModuleAsyncOptions): DynamicModule {
        return {
            module: EventNestMongoDbModule,
            providers: [provideEventStoreAsync(options)],
            exports: [EVENT_STORE]
        };
    }
}
