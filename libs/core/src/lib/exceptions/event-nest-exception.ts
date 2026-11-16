import { isNotNil } from "es-toolkit";
import { isObject } from "es-toolkit/compat";

const EVENT_NEST_ERROR: unique symbol = Symbol.for("@event-nest/error");

export class EventNestException extends Error {
    readonly [EVENT_NEST_ERROR] = true;

    constructor(
        private _errorName: string,
        private _errorCode: string,
        message: string
    ) {
        super(`${_errorName} (${_errorCode}): ${message}`);
    }

    get errorCode(): string {
        return this._errorCode;
    }

    get errorName(): string {
        return this._errorName;
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
