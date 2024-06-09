import { Class } from "type-fest";

import { EventNameConflictException } from "./exceptions/event-name-conflict-exception";
import { isNil } from "./utils/type-utils";

type Registration = {
    eventClass: unknown;
    eventName: string;
};

const registrations: Array<Registration> = [];

/**
 * Returns the event name that matches the class of the provided object.
 * @param target
 */
export function getEventName(target: object): string | undefined {
    const found = registrations.find((registration) => registration.eventClass === target.constructor);
    return found ? found.eventName : undefined;
}

/**
 * Returns the class that matches the provided name. Or undefined.
 * @param name The event name to be checked.
 */
export function getEventClass<T>(name: string): Class<T> | undefined {
    const found = registrations.find((registration) => registration.eventName === name);
    return isNil(found) ? undefined : (found.eventClass as Class<T>);
}

export function isRegistered(event: object): boolean {
    return !isNil(getEventName(event));
}

export function registerEvent(newRegistration: Registration) {
    if (registrations.some((registration) => registration.eventName === newRegistration.eventName)) {
        throw new EventNameConflictException(newRegistration.eventName);
    }

    registrations.push(newRegistration);
}
