import { ClassConstructor } from "class-transformer";
import { EventNameConflictException } from "./exceptions/event-name-conflict-exception";
import { isNil } from "./utils/type-utils";

interface EventRegistration {
    eventName: string;
    eventClass: unknown;
}

const REGISTRATIONS: Array<EventRegistration> = [];

export function RegisteredEvent(eventName: string): ClassDecorator {
    return (target) => {
        if (REGISTRATIONS.some((registration) => registration.eventName === eventName)) {
            throw new EventNameConflictException(eventName);
        }
        REGISTRATIONS.push({
            eventName: eventName,
            eventClass: target
        });
    };
}

/**
 * Returns the event name that matches the class of the provided object.
 * @param target
 */
export function getEventName(target: object): string | undefined {
    const found = REGISTRATIONS.find((registration) => registration.eventClass === target.constructor);
    return found ? found.eventName : undefined;
}

/**
 * Returns the class that matches the provided name. Or undefined.
 * @param name The event name to be checked.
 */
export function getEventClass<T>(name: string): ClassConstructor<T> | undefined {
    const found = REGISTRATIONS.find((registration) => registration.eventName === name);
    return isNil(found) ? undefined : (found.eventClass as ClassConstructor<T>);
}

export function isRegistered(event: object): boolean {
    return !isNil(getEventName(event));
}
