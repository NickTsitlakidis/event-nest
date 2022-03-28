export class MissingEventHandlerException extends Error {
    constructor(eventName: string, aggregateRootId: string) {
        super(`Missing event handler for event : ${eventName} of aggregate root : ${aggregateRootId}`);
    }
}
