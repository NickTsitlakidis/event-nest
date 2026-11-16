import { isNotNil } from "es-toolkit";
import { isObject } from "es-toolkit/compat";

const EVENT_NEST_ERROR: unique symbol = Symbol.for("@event-nest/error");

export class EventNestException extends Error {
    readonly [EVENT_NEST_ERROR] = true;

    /**
     * @param errorName The exception class name. It is assigned to the standard `name` property so that loggers and
     * stack traces show the concrete exception instead of `Error`.
     * @param errorCode The stable error code of the exception. Codes are the contract to match on; messages may change.
     * @param message The human-readable description
     */
    constructor(
        errorName: string,
        readonly errorCode: string,
        message: string
    ) {
        super(message);
        this.name = errorName;
    }
}

/**
 * Checks if the provided value is an Event Nest error. The check relies on a global symbol brand instead of
 * `instanceof`, so it also works when multiple copies of `@event-nest/core` are installed.
 * @param error The value to check, typically the value received in a catch block
 */
export function isEventNestError(error: unknown): error is EventNestException {
    return isObject(error) && isNotNil(error) && (error as Record<PropertyKey, unknown>)[EVENT_NEST_ERROR] === true;
}
