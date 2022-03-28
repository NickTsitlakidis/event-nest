import { EventNameConflictException } from "../exceptions/event-name-conflict-exception";
import { ClassConstructor } from "class-transformer";

interface EventRegistration {
    eventName: string;
    eventClass;
}

const REGISTRATIONS: Array<EventRegistration> = [];

export function SerializedEvent(eventName: string): ClassDecorator {
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
export function getEventNameForObject(target: unknown): string | undefined {
    const found = REGISTRATIONS.find((registration) => registration.eventClass === target.constructor);
    return found ? found.eventName : undefined;
}

/**
 * Returns the class that matches the provided name. Or undefined.
 * @param name The event name to be checked.
 */
export function getEventClassForName<T>(name: string): ClassConstructor<T> | undefined {
    const found = REGISTRATIONS.find((registration) => registration.eventName === name);
    return found.eventClass;
}

/**
 * Returns if the provided class has a registered event name.
 * @param target The class to be checked.
 */
export function hasEventName(target: unknown): boolean {
    return REGISTRATIONS.some((registration) => registration.eventClass === target.constructor);
}
