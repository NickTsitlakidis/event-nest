/* eslint-disable unicorn/no-nonstandard-builtin-properties */
import "reflect-metadata";
import { isString } from "es-toolkit";

import { APPLY_EVENT_DECORATOR_KEY } from "../metadata-keys";
import { Class } from "../utils/type-utils";
import { AggregateRoot } from "./aggregate-root";

export function getDecoratedPropertyKey(entity: AggregateRoot, eventClass: Class<unknown>): string | undefined {
    const metadataKeys = Reflect.getMetadataKeys(entity);
    if (!metadataKeys || metadataKeys.length === 0) {
        return undefined;
    }

    const matchingKey = metadataKeys.find((metadataKey) => {
        // Other decorators and libraries keep their own metadata on the same object, under their own keys.
        if (!isString(metadataKey) || !metadataKey.startsWith(APPLY_EVENT_DECORATOR_KEY)) {
            return false;
        }
        return Reflect.getMetadata(metadataKey, entity).eventClasses.includes(eventClass);
    });

    if (!matchingKey) {
        return undefined;
    }

    return Reflect.getMetadata(matchingKey, entity).key;
}
