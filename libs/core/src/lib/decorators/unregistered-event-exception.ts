export class UnregisteredEventException extends Error {
    constructor(eventClassName: string) {
        super(`${eventClassName} is not registered to be processed. Use @RegisteredEvent decorator to register it.`);
    }
}
