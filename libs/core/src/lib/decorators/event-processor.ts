import "reflect-metadata";
import { AggregateRoot } from "../domain/aggregate-root";
import { ClassConstructor } from "class-transformer";

const METADATA_KEY = "process-event-meta";

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

export function EventProcessor(eventClass: ClassConstructor<unknown>): PropertyDecorator {
    return (propertyParent, propertyKey) => {
        Reflect.defineMetadata(
            METADATA_KEY + "-" + propertyKey.toString(),
            { eventClass: eventClass, key: propertyKey },
            propertyParent
        );
    };
}
