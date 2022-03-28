export class EventNameConflictException extends Error {
    constructor(name: string) {
        super(`${name} is already registered as SerializedEvent. Use another name`);
    }
}
