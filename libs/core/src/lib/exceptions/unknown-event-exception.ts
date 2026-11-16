import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Thrown during reconstitution of an aggregate root if the event is not registered using the @DomainEvent decorator.
 */
export class UnknownEventException extends EventNestException {
    constructor(unregisteredEventNames: Array<string>, missingApplyEventNames: Array<string>, aggregateRootId: string) {
        super(
            UnknownEventException.name,
            CoreErrorCodes.UNKNOWN_EVENT,
            `Found unknown events for aggregate root ${aggregateRootId}. Unregistered : ${unregisteredEventNames.join(
                ", "
            )}. Missing apply method: ${missingApplyEventNames.join(", ")}`
        );
    }
}
