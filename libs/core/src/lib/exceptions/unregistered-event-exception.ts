export class UnregisteredEventException extends Error {
    constructor(eventClassName: string) {
        super(`${eventClassName} is not registered to be processed. Use the @DomainEvent decorator to register it.`);
    }
}
