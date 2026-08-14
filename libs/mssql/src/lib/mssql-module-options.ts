import { CoreModuleOptions, SnapshotStrategy } from "@event-nest/core";

export interface ConnectionPoolOptions {
    acquireTimeoutMillis?: number;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    afterCreate?: Function;
    createRetryIntervalMillis?: number;
    createTimeoutMillis?: number;
    destroyTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    log?: (message: string, logLevel: string) => void;
    max?: number;
    min?: number;
    name?: string;
    priorityRange?: number;
    propagateCreateError?: boolean;
    reapIntervalMillis?: number;
    refreshIdle?: boolean;
    returnToHead?: boolean;
}

export interface MSSQLConnectionOptions {
    connectionTimeout?: number;
    database: string;
    encrypt?: boolean;
    instanceName?: string;
    password: string;
    port?: number;
    requestTimeout?: number;
    server: string;
    serverName?: string;
    trustServerCertificate?: boolean;
    user: string;
}

export interface MSSQLModuleAsyncOptions {
    inject?: any[];
    useFactory: (...parameters: any[]) => MSSQLModuleOptions | Promise<MSSQLModuleOptions>;
}

export type MSSQLModuleOptions = CoreModuleOptions &
    (SnapshotsDisabled | SnapshotsEnabled) & {
        /**
         * The name of the table that will be used to store the aggregate root rows.
         */
        aggregatesTableName: string;
        connection: MSSQLConnectionOptions;
        connectionPool?: ConnectionPoolOptions;

        /**
         * A flag to determine if the tables should be created when they do not exist.
         * This setting requires a user with the necessary permissions to create tables.
         * By default, this setting is disabled.
         */
        ensureTablesExist?: boolean;

        /**
         * The name of the table that will be used to store the event rows
         */
        eventsTableName: string;
        schemaName: string;
    };

type SnapshotsDisabled = {
    snapshotStrategy?: undefined;
    snapshotTableName?: undefined;
};

type SnapshotsEnabled = {
    /**
     * The snapshot strategy to use for determining when snapshots should be created for aggregate roots.
     * See {@link SnapshotStrategy} for more information.
     */
    snapshotStrategy: SnapshotStrategy;
    /**
     * The name of the table which will be used to store the aggregate snapshots.
     * You can omit this option if you do not want to use snapshots optimization.
     */
    snapshotTableName: string;
};
