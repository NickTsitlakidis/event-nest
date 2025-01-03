/**
 * Thrown during event persistence if there's a concurrency issue.
 * Concurrency issues are detected if the expected version of an aggregate root is different from the version stored in the database.
 *
 * Typically, this could only happen if some other process in your system has updated the aggregate root in the meantime.
 *
 * By catching this exception, you can decide how to handle the situation.
 */
export class EventConcurrencyException extends Error {
    constructor(aggregateRootId: string, databaseVersion: number, version: number) {
        super(`Concurrency issue for aggregate ${aggregateRootId}. Expected ${version}. Stored ${databaseVersion}`);
    }
}
