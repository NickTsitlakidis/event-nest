import { isNotNil } from "es-toolkit";

const MAX_IDENTIFIER_LENGTH = 128;

/**
 * Class representing the configuration of an MS SQL Server database schema and its related tables.
 * Provides utilities to access schema and table names, both standalone and schema-aware.
 */
export class SchemaConfiguration {
    constructor(
        private readonly _schema: string,
        private readonly _aggregatesTable: string,
        private readonly _eventsTable: string,
        private readonly _snapshotTable?: string
    ) {
        this._validateIdentifier("schemaName", _schema);
        this._validateIdentifier("aggregatesTableName", _aggregatesTable);
        this._validateIdentifier("eventsTableName", _eventsTable);
        if (isNotNil(_snapshotTable)) {
            this._validateIdentifier("snapshotTableName", _snapshotTable);
        }
    }

    get aggregatesTable(): string {
        return this._aggregatesTable;
    }

    get eventsTable(): string {
        return this._eventsTable;
    }

    get schema(): string {
        return this._schema;
    }

    get schemaAwareAggregatesTable(): string {
        return `${this._schema}.${this._aggregatesTable}`;
    }

    get schemaAwareEventsTable(): string {
        return `${this._schema}.${this._eventsTable}`;
    }

    get schemaAwareSnapshotTable(): string | undefined {
        return isNotNil(this._snapshotTable) ? `${this._schema}.${this._snapshotTable}` : undefined;
    }

    get snapshotTable(): string | undefined {
        return this._snapshotTable;
    }

    private _validateIdentifier(optionName: string, value: string): void {
        if (value.trim().length === 0 || value.length > MAX_IDENTIFIER_LENGTH || value.includes(".")) {
            throw new Error(
                `${optionName} must be a non-empty SQL Server identifier without dots (maximum 128 characters).`
            );
        }
    }
}
