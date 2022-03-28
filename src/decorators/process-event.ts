import "reflect-metadata";

const METADATA_KEY = "ne-process-event";

export function getProcessFunctionKey(entity, eventClass): string | undefined {
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

export function ProcessEvent(eventClass): PropertyDecorator {
    return (propertyParent, propertyKey: string) => {
        Reflect.defineMetadata(
            METADATA_KEY + "-" + propertyKey,
            { eventClass: eventClass, key: propertyKey },
            propertyParent
        );
    };
}
