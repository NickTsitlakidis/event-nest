import "reflect-metadata";
import { isNil } from "es-toolkit";

import { MissingEventClassException } from "../exceptions/missing-event-class-exception";
import { APPLY_EVENT_DECORATOR_KEY } from "../metadata-keys";
import { Class } from "../utils/type-utils";

/**
 * A decorator to mark that a method is used to apply a specific event to an aggregate root.
 * When an aggregate root has to be reconstituted based on persisted events, these methods
 * are called to process the events.
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
        Reflect.defineMetadata(
            APPLY_EVENT_DECORATOR_KEY + "-" + propertyKey.toString(),
            { eventClass: eventClass, key: propertyKey },
            propertyParent
        );
    };
}
