import { isNil } from "es-toolkit";
import { Class } from "type-fest";

import { EventNameConflictException } from "./exceptions/event-name-conflict-exception";

type Registration = {
    eventClass: unknown;
    eventName: string;
};

const registrations: Array<Registration> = [];

/**
 * Returns the class that matches the provided name. Or undefined.
 * @param name The event name to be checked.
 */
export function getEventClass<T>(name: string): Class<T> | undefined {
    const found = registrations.find((registration) => registration.eventName === name);
    return isNil(found) ? undefined : (found.eventClass as Class<T>);
}

/**
 * Returns the event name that matches the class of the provided object.
 * @param target
 */
export function getEventName(target: object): string | undefined {
    const found = registrations.find((registration) => registration.eventClass === target.constructor);
    return found ? found.eventName : undefined;
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
