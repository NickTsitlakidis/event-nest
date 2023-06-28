export class MissingEventProcessor extends Error {
    constructor(eventName: string, aggregateRootId: string) {
        super(`Missing event processor for event : ${eventName} of aggregate root : ${aggregateRootId}`);
    }
}
