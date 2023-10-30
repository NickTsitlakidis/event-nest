import { registerEvent } from "./domain-event-registrations";

/**
 * A decorator to mark a class as a domain event. Objects of this type of classes are persisted in the database and
 * they describe the events which happened in the system.
 *
 * The classes can contain any data required to describe the event with the only limitation being that the object will be
 * converted to JSON using the class-transformer library. That means that class-transformer rules have to be followed to make
 * sure the object can be converted to and from JSON.
 * @param eventName The name of the event. This name will be used to identify the event in the database and it has to be unique.
 * If the name is not unique, an exception will be thrown when the decorator runs for the first time.
 * @constructor
 */
export function DomainEvent(eventName: string): ClassDecorator {
    return (target) => {
        registerEvent({
            eventName: eventName,
            eventClass: target
        });
    };
}
