import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

export class UnknownEventVersionException extends EventNestException {
    constructor(
        readonly eventId: string,
        readonly aggregateRootId: string
    ) {
        super(
            UnknownEventVersionException.name,
            CoreErrorCodes.UNKNOWN_EVENT_VERSION,
            `Unable to set version of event ${eventId} for aggregate root with id ${aggregateRootId}`
        );
    }
}
