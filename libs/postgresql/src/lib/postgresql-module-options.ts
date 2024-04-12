import { CoreModuleOptions } from "@event-nest/core";

export interface SslOptions {
    certificate?: string;
    rejectUnauthorized: boolean;
}

export interface PostgreSQLModuleOptions extends CoreModuleOptions {
    /**
     * The name of the table which will be used to store the aggregate root rows.
     */
    aggregatesTableName: string;
    /**
     * A valid connection string which will be used to connect to the PostgreSQL server.
     */
    connectionUri: string;

    /**
     * The name of the table which will be used to store the event rows
     */
    eventsTableName: string;
    /**
     * The name of the database schema
     */
    schemaName: string;
    /**
     * Options to define if you want to use SSL or not. By default, the setting is disabled. To enable it you need to
     * provide a string representation of your certificate and set the rejectUnauthorized flag to true.
     */
    ssl?: SslOptions;
}

export interface PostgreSQLModuleAsyncOptions {
    inject?: any[];
    useFactory: (...args: any[]) => PostgreSQLModuleOptions | Promise<PostgreSQLModuleOptions>;
}
