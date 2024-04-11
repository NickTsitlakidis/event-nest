import { CoreModuleOptions } from "@event-nest/core";

export interface PostgreSQLModuleOptions extends CoreModuleOptions {
    /**
     * A valid connection string which will be used to connect to the PostgreSQL server.
     */
    connectionUri: string;
    /**
     * The name of the database schema
     */
    schemaName: string;
    /**
     * The name of the table which will be used to store the aggregate root rows.
     */
    aggregatesTableName: string;
    /**
     * The name of the table which will be used to store the event rows
     */
    eventsTableName: string;
}

export interface PostgreSQLModuleAsyncOptions {
    useFactory: (...args: any[]) => Promise<PostgreSQLModuleOptions> | PostgreSQLModuleOptions;
    inject?: any[];
}
