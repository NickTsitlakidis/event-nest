/* eslint-disable unicorn/no-nonstandard-builtin-properties */
import "reflect-metadata";
import { isNil, uniq } from "es-toolkit";

import { MissingEventClassException } from "../exceptions/missing-event-class-exception";
import { APPLY_EVENT_DECORATOR_KEY } from "../metadata-keys";
import { Class } from "../utils/type-utils";

/**
 * A decorator to mark that a method is used to apply a specific event to an aggregate root.
 * When an aggregate root has to be reconstituted based on persisted events, these methods
 * are called to process the events.
 *
 * The decorator can be stacked on the same method when that method applies more than one event.
 *
 * @param eventClass The class of the event to be applied.
 * @throws {MissingEventClassException} When the event class is undefined or null.
 * @constructor
 */
export function ApplyEvent(eventClass: Class<unknown>): PropertyDecorator {
    if (isNil(eventClass)) {
        throw new MissingEventClassException();
    }
    return (propertyParent, propertyKey) => {
        const metadataKey = APPLY_EVENT_DECORATOR_KEY + "-" + propertyKey.toString();
        // Only the metadata of this exact class is extended. A subclass that overrides a method keeps
        // replacing the event classes of the parent method instead of adding to them.
        const existing: Array<Class<unknown>> = Reflect.getOwnMetadata(metadataKey, propertyParent)?.eventClasses ?? [];
        Reflect.defineMetadata(
            metadataKey,
            { eventClasses: uniq([...existing, eventClass]), key: propertyKey },
            propertyParent
        );
    };
}
