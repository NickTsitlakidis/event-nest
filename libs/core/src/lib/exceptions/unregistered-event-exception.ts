import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Thrown if an event is passed to the aggregate root's append method but it's not registered using the @DomainEvent decorator.
 */
export class UnregisteredEventException extends EventNestException {
    constructor(eventClassName: string) {
        super(
            UnregisteredEventException.name,
            CoreErrorCodes.UNREGISTERED_EVENT,
            `${eventClassName} is not registered to be processed. Use the @DomainEvent decorator to register it.`
        );
    }
}
