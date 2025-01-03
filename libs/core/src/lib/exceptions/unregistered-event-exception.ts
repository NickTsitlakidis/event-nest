/**
 * Thrown if an event is passed to the aggregate root's append method but it's not registered using the @DomainEvent decorator.
 */
export class UnregisteredEventException extends Error {
    constructor(eventClassName: string) {
        super(`${eventClassName} is not registered to be processed. Use the @DomainEvent decorator to register it.`);
    }
}
