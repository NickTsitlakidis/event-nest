import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Exception thrown when an error occurs while running subscriptions for an event.
 * The caught error, the event class name and the event id are stored in the exception.
 */
export class SubscriptionException extends EventNestException {
    private readonly _caughtError: Error;
    private readonly _eventClassName: string;
    private readonly _eventId: string;

    constructor(caughtError: Error, eventClassName: string, eventId: string) {
        super(
            SubscriptionException.name,
            CoreErrorCodes.SUBSCRIPTION_FAILURE,
            `Error while running subscriptions for event ${eventClassName} with id ${eventId}`
        );
        this._caughtError = caughtError;
        this._eventClassName = eventClassName;
        this._eventId = eventId;
    }

    get caughtError(): Error {
        return this._caughtError;
    }

    get eventClassName(): string {
        return this._eventClassName;
    }

    get eventId(): string {
        return this._eventId;
    }
}
