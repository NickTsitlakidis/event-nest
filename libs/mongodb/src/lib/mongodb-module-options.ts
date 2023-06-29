export interface MongodbModuleOptions {
    connectionUri: string;
    aggregatesCollection: string;
    eventsCollection: string;
}

export interface MongoDbModuleAsyncOptions {
    useFactory: (...args: any[]) => Promise<MongodbModuleOptions> | MongodbModuleOptions;
    inject?: any[];
}
