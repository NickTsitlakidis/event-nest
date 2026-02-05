import { CoreModuleOptions, SnapshotStrategy } from "@event-nest/core";
import { MongoClientOptions } from "mongodb";

// eslint-disable-next-line unicorn/prevent-abbreviations
export interface MongoDbModuleAsyncOptions {
    inject?: any[];
    useFactory: (...parameters: any[]) => MongodbModuleOptions | Promise<MongodbModuleOptions>;
}

export type MongodbModuleOptions = CoreModuleOptions &
    (SnapshotsDisabled | SnapshotsEnabled) & {
        /**
         * The name of the collection which will be used to store the aggregate root objects.
         */
        aggregatesCollection: string;
        /**
         * A valid connection string which will be used to connect to the MongoDB instance.
         */
        connectionUri: string;
        /**
         * The name of the collection which will be used to store the event objects
         */
        eventsCollection: string;

        /**
         * Configuration options for the MongoDB client.
         * The options follow the MongoDB Node.js driver options, and they will
         * be passed to the MongoClient constructor.
         */
        mongoClientConfiguration?: MongoClientOptions;
    };

type SnapshotsDisabled = {
    snapshotCollection?: undefined;
    snapshotStrategy?: undefined;
};

type SnapshotsEnabled = {
    /**
     * The name of the collection which will be used to store the aggregate snapshots
     * You can omit this option if you do not want to use snapshots optimization.
     */
    snapshotCollection: string;
    /**
     * The snapshot strategy to use for determining when snapshots should be created for aggregate roots.
     * See {@link SnapshotStrategy} for more information.
     */
    snapshotStrategy: SnapshotStrategy;
};
