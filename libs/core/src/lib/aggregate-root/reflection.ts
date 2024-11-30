import "reflect-metadata";
import { Class } from "type-fest";

import { AggregateRoot } from "./aggregate-root";

export function getDecoratedPropertyKey(entity: AggregateRoot, eventClass: Class<unknown>): string | undefined {
    const metadataKeys = Reflect.getMetadataKeys(entity);
    if (!metadataKeys || metadataKeys.length === 0) {
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
