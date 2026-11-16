import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Exception thrown when an event version cannot be determined or assigned for a specific event
 * within an aggregate root.
 *
 * This error indicates that the event version is unknown in the current event processing context,
 * preventing the event from being correctly associated with its aggregate root history.
 */
export class UnknownEventVersionException extends EventNestException {
    static readonly code = CoreErrorCodes.UNKNOWN_EVENT_VERSION;

    constructor(
        readonly eventId: string,
        readonly aggregateRootId: string
    ) {
        super(
            UnknownEventVersionException.name,
            UnknownEventVersionException.code,
            `Unable to set version of event ${eventId} for aggregate root with id ${aggregateRootId}`
        );
    }
}
