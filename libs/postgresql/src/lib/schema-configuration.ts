/**
 * A configuration class which holds the schema, aggregates table, and events table names for the PostgreSQL database.
 */
export class SchemaConfiguration {
    constructor(
        private readonly _schema: string,
        private readonly _aggregatesTable: string,
        private readonly _eventsTable: string,
        private readonly _snapshotTable?: string
    ) {}

    get aggregatesTable(): string {
        return this._aggregatesTable;
    }

    get eventsTable(): string {
        return this._eventsTable;
    }

    get schema(): string {
        return this._schema;
    }

    /**
     * The schema-aware aggregates table name (schema.aggregatesTable)
     */
    get schemaAwareAggregatesTable(): string {
        return this._schema + "." + this._aggregatesTable;
    }

    /**
     * The schema-aware events table name (schema.eventsTable)
     */
    get schemaAwareEventsTable(): string {
        return this._schema + "." + this._eventsTable;
    }

    /**
     * The schema-aware snapshots table name (schema.snapshotTable)
     */
    get schemaAwareSnapshotTable(): string | undefined {
        if (!this._snapshotTable) return undefined;
        return this._schema + "." + this._snapshotTable;
    }

    get snapshotTable(): string | undefined {
        return this._snapshotTable;
    }
}
