import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Thrown when the name of an event is already used for another event.
 */
export class EventNameConflictException extends EventNestException {
    constructor(name: string) {
        super(
            EventNameConflictException.name,
            CoreErrorCodes.EVENT_NAME_CONFLICT,
            `${name} is already registered as RegisteredEvent. Use another name`
        );
    }
}
