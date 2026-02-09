import { AGGREGATE_ROOT_NAME_KEY, AGGREGATE_ROOT_SNAPSHOT_REVISION_KEY } from "../metadata-keys";
import { AggregateRootClass, SnapshotAwareAggregateRoot } from "../storage/event-store";

export interface AggregateRootConfigParameters {
    /**
     * Will be saved with each event in the database and used during event retrieval to ensure
     * the correct events are retrieved
     */
    name: string;
    /**
     * Optinal snapshot revision number that's used for snapshot optimization.
     */
    snapshotRevision?: number;
}

/**
 * A decorator to configure an aggregate root class with a unique name and optional snapshot revision.
 *
 * @param params - Configuration parameters including the aggregate root name and optional snapshot revision
 */
export const AggregateRootConfig = ({ name, snapshotRevision }: AggregateRootConfigParameters): ClassDecorator => {
    return (target: object) => {
        Reflect.defineMetadata(AGGREGATE_ROOT_NAME_KEY, { aggregateRootName: name }, target);
        Reflect.defineMetadata(
            AGGREGATE_ROOT_SNAPSHOT_REVISION_KEY,
            { aggregateRootSnapshotRevision: snapshotRevision },
            target
        );
    };
};

/**
 * Used to obtain the name attached to AggregateRoot class by getting it's metadata
 * Works with both @see {@link AggregateRootConfig} and @see {@link AggregateRootName}
 * Uses function overloading, because it's already known that SnapshotAwareAggregateRoot has name defined
 *
 * @param targetClass - the AggregateRoot class
 * @returns snapshotRevision from provided {@link AggregateRootConfigParameters} or undefined if not present
 */
export function getAggregateRootName(targetClass: AggregateRootClass<SnapshotAwareAggregateRoot>): string;
export function getAggregateRootName(targetClass: AggregateRootClass<unknown>): string | undefined;
export function getAggregateRootName(targetClass: AggregateRootClass<unknown>): string | undefined {
    return Reflect.getMetadata(AGGREGATE_ROOT_NAME_KEY, targetClass)?.aggregateRootName;
}

/**
 * Used to obtain the snapshotRevision number attached to AggregateRoot class by getting it's metadata
 * Uses function overloading, because it's already known that SnapshotAwareAggregateRoot has snasphotRevision defined
 *
 * @param aggregateRootClass - the AggregateRootClass
 * @returns snapshotRevision from provided {@link AggregateRootConfigParameters} or undefined if not present
 */
export function getAggregateRootSnapshotRevision(targetClass: AggregateRootClass<SnapshotAwareAggregateRoot>): number;
export function getAggregateRootSnapshotRevision(targetClass: AggregateRootClass<unknown>): number | undefined;
export function getAggregateRootSnapshotRevision(targetClass: AggregateRootClass<unknown>): number | undefined {
    return Reflect.getMetadata(AGGREGATE_ROOT_SNAPSHOT_REVISION_KEY, targetClass)?.aggregateRootSnapshotRevision;
}
