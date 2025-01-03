/**
 * Thrown when the name of an event is already used for another event.
 */
export class EventNameConflictException extends Error {
    constructor(name: string) {
        super(`${name} is already registered as RegisteredEvent. Use another name`);
    }
}
