import "reflect-metadata";
import { Class } from "type-fest";

import { APPLY_EVENT_DECORATOR_KEY } from "../metadata-keys";

/**
 * A decorator to mark that a method is used to apply a specific event to an aggregate root.
 * When an aggregate root has to be reconstituted based on persisted events, these methods
 * are called to process the events.
 *
 * @param eventClass The class of the event to be applied.
 * @constructor
 */
export function ApplyEvent(eventClass: Class<unknown>): PropertyDecorator {
    return (propertyParent, propertyKey) => {
        Reflect.defineMetadata(
            APPLY_EVENT_DECORATOR_KEY + "-" + propertyKey.toString(),
            { eventClass: eventClass, key: propertyKey },
            propertyParent
        );
    };
}
