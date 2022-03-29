export class EventConcurrencyException extends Error {
    constructor(aggregateRootId: string, databaseVersion: number, version: number) {
        super(`Concurrency issue for aggregate ${aggregateRootId}. Expected ${version}. Stored ${databaseVersion}`);
    }
}
