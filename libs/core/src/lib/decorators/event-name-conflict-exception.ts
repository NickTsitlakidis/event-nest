export class EventNameConflictException extends Error {
    constructor(name: string) {
        super(`${name} is already registered as RegisteredEvent. Use another name`);
    }
}
