import { DynamicModule, Global, Module } from "@nestjs/common";
import { MongodbModuleSyncOptions } from "./mongodb-module-options";
import { provideEventStore } from "./storage/event-store-provider";
import { EVENT_STORE } from "@event-nest/core";

@Global()
@Module({})
export class MongodbModule {
    static forRoot(options: MongodbModuleSyncOptions): DynamicModule {
        return {
            module: MongodbModule,
            providers: [provideEventStore(options)],
            exports: [EVENT_STORE]
        };
    }
}
