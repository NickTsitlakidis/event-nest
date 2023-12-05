import "reflect-metadata";
import { AggregateRoot } from "./aggregate-root";
import { ClassConstructor } from "class-transformer";
import { EVENT_PROCESSOR_KEY } from "../metadata-keys";

export function getDecoratedPropertyKey(
    entity: AggregateRoot,
    eventClass: ClassConstructor<unknown>
): string | undefined {
    const metadataKeys = Reflect.getMetadataKeys(entity);
    if (!metadataKeys || metadataKeys.length == 0) {
        return undefined;
    }

    const matchingKey = metadataKeys.find((metadataKey) => {
        const metadata = Reflect.getMetadata(metadataKey, entity);
        return metadata.eventClass === eventClass;
    });

    if (!matchingKey) {
        return undefined;
    }

    return Reflect.getMetadata(matchingKey, entity).key;
}

/**
 * A decorator to mark a method as an event processor.
 * When an aggregate root has to be recreated based on database events, these methods
 * are called to process the events.
 *
 * @param eventClass The event class that this method processes.
 * @constructor
 */
export function EventProcessor(eventClass: ClassConstructor<unknown>): PropertyDecorator {
    return (propertyParent, propertyKey) => {
        Reflect.defineMetadata(
            EVENT_PROCESSOR_KEY + "-" + propertyKey.toString(),
            { eventClass: eventClass, key: propertyKey },
            propertyParent
        );
    };
}
