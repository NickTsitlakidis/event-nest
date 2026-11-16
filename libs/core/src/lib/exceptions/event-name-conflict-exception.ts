import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Thrown when the name of an event is already used for another event.
 */
export class EventNameConflictException extends EventNestException {
    static readonly code = CoreErrorCodes.EVENT_NAME_CONFLICT;

    constructor(readonly eventName: string) {
        super(
            EventNameConflictException.name,
            EventNameConflictException.code,
            `${eventName} is already registered as RegisteredEvent. Use another name`
        );
    }
}
