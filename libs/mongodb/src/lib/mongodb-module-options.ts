import { CoreModuleOptions } from "@event-nest/core";

export interface MongodbModuleOptions extends CoreModuleOptions {
    /**
     * A valid connection string which will be used to connect to the MongoDB instance.
     */
    connectionUri: string;
    /**
     * The name of the collection which will be used to store the aggregate root objects.
     */
    aggregatesCollection: string;
    /**
     * The name of the collection which will be used to store the event objects
     */
    eventsCollection: string;
}

export interface MongoDbModuleAsyncOptions {
    useFactory: (...args: any[]) => Promise<MongodbModuleOptions> | MongodbModuleOptions;
    inject?: any[];
}
