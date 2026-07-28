import { isNil } from "es-toolkit";

import { registerEvent } from "./domain-event-registrations";

export type DomainEventOptions = {
    /**
     * Alternative names that resolve to this event class when stored events are read. Useful for renaming an event
     * without migrating the rows that were persisted under its previous name. New events are always persisted with
     * the canonical name. Aliases have to be unique across all registered events, in the same way as event names.
     */
    aliases?: Array<string>;
};

/**
 * A decorator to mark a class as a domain event. Objects of these classes are persisted in the database and
 * they describe the events which happened in the system.
 *
 * The classes can contain any data required to describe the event with the only limitation being that the object will be
 * converted to JSON using the class-transformer library. That means that class-transformer rules have to be followed to make
 * sure the object can be converted to and from JSON.
 * @param eventName The name of the event. This name will be used to identify the event in the database and it has to be unique.
 * If the name is not unique, an exception will be thrown when the decorator runs for the first time.
 * @param options Optional settings for the event, such as aliases that map previously used event names to this class.
 * @constructor
 */
export function DomainEvent(eventName: string, options?: DomainEventOptions): ClassDecorator {
    return (target) => {
        registerEvent({
            aliases: isNil(options?.aliases) ? [] : [...options.aliases],
            eventClass: target,
            eventName: eventName
        });
    };
}
