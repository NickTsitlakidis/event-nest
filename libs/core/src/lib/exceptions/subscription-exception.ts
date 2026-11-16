import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Exception thrown when an error occurs while running subscriptions for an event.
 * The caught error, the event class name and the event id are stored in the exception.
 */
export class SubscriptionException extends EventNestException {
    static readonly code = CoreErrorCodes.SUBSCRIPTION_FAILURE;

    constructor(
        readonly caughtError: Error,
        readonly eventClassName: string,
        readonly eventId: string
    ) {
        super(
            SubscriptionException.name,
            SubscriptionException.code,
            `Error while running subscriptions for event ${eventClassName} with id ${eventId}`
        );
    }
}
