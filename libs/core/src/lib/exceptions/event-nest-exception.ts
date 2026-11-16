import { isNotNil, isString } from "es-toolkit";
import { isObject } from "es-toolkit/compat";

const EVENT_NEST_ERROR: unique symbol = Symbol.for("@event-nest/error");

/**
 * The static shape shared by every Event Nest exception class: the class exposes its error code as a static
 * property so that it can be matched by code instead of by `instanceof`.
 */
type EventNestExceptionClass<T extends EventNestException = EventNestException> = {
    readonly code: string;
    readonly prototype: T;
};

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
 * Checks if the provided value is an Event Nest exception. The check relies on a global symbol brand and a string
 * `errorCode` instead of `instanceof`, so it also works when multiple copies of `@event-nest/core` are installed.
 * @param error The value to check, typically the value received in a catch block
 */
export function isEventNestException(error: unknown): error is EventNestException;
/**
 * Checks if the provided value is an Event Nest exception with the given error code.
 * @param error The value to check, typically the value received in a catch block
 * @param code The error code to match against the `errorCode` property of the exception
 */
export function isEventNestException(error: unknown, code: string): error is EventNestException;
/**
 * Checks if the provided value is an Event Nest exception of the given class. The match is done by comparing the
 * `errorCode` property with the static `code` of the class, so it narrows the type without relying on `instanceof`.
 * @param error The value to check, typically the value received in a catch block
 * @param exceptionClass The exception class whose static `code` has to match
 */
export function isEventNestException<T extends EventNestException>(
    error: unknown,
    exceptionClass: EventNestExceptionClass<T>
): error is T;
export function isEventNestException(error: unknown, codeOrClass?: EventNestExceptionClass | string): boolean {
    const isBranded =
        isObject(error) &&
        isNotNil(error) &&
        (error as Record<PropertyKey, unknown>)[EVENT_NEST_ERROR] === true &&
        isString((error as Record<PropertyKey, unknown>)["errorCode"]);
    if (!isBranded || codeOrClass === undefined) {
        return isBranded;
    }

    const expectedCode = isString(codeOrClass) ? codeOrClass : codeOrClass.code;
    return (error as EventNestException).errorCode === expectedCode;
}
