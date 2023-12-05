export class UnknownEventVersionException extends Error {
    constructor(eventId: string, aggregateRootId: string) {
        super(`Unable to set version of event ${eventId} for aggregate root with id ${aggregateRootId}`);
    }
}
