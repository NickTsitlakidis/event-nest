import "reflect-metadata";

import { AGGREGATE_ROOT_NAME_KEY } from "../metadata-keys";

/**
 * A decorator to mark an aggregate root class with a unique name. The name will
 * be saved with each event in the database.
 *
 * It will also be used during the retrieval process of the events to make sure that
 * the correct events are retrieved.
 * @deprecated Use {@link AggregateRootConfig} decorator instead.
 * @param name The name of the aggregate root
 * @constructor
 */
export const AggregateRootName = (name: string): ClassDecorator => {
    return (target: object) => {
        Reflect.defineMetadata(AGGREGATE_ROOT_NAME_KEY, { aggregateRootName: name }, target);
    };
};
