/**
 * A configuration class which holds the database name, aggregates table, and events table names for the MySQL database.
 */
export class DatabaseConfiguration {
    constructor(
        private readonly _database: string,
        private readonly _aggregatesTable: string,
        private readonly _eventsTable: string
    ) {}

    get aggregatesTable(): string {
        return this._aggregatesTable;
    }

    get database(): string {
        return this._database;
    }

    /**
     * The database-aware aggregates table name (database.aggregatesTable)
     */
    get databaseAwareAggregatesTable(): string {
        return this._database + "." + this._aggregatesTable;
    }

    /**
     * The database-aware events table name (database.eventsTable)
     */
    get databaseAwareEventsTable(): string {
        return this._database + "." + this._eventsTable;
    }

    get eventsTable(): string {
        return this._eventsTable;
    }
}
