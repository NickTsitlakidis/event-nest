import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { StoredAggregateRoot } from "./stored-aggregate-root";
import { StoredEvent } from "./stored-event";

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type AggregateRootClass<T> = Function & { prototype: T };

export type AggregateRootSnapshot<T extends AggregateRoot = AggregateRoot> =
    T extends AggregateRoot<infer Snapshot> ? Snapshot : unknown;

export type SnapshotAwareAggregateClass<T extends AggregateRoot = AggregateRoot> = AggregateRootClass<T> & {
    snapshotRevision: number;
};

/**
 * A unique symbol that can be used to inject the event store into other classes.
 */
export const EVENT_STORE = Symbol("EVENT_NEST_EVENT_STORE");

/**
 * Defines the main EventStore interface that can be used to retrieve and save events. Each implementation of this interface
 * is unique based on the storage solution that is used.
 *
 * To inject it in your NestJS classes, you can use the {@link EVENT_STORE} symbol.
 */
export interface EventStore {
    /**
     * Each aggregate root object needs some way of connecting to the event store in order to be able to store its events.
     * Since these objects are not handled by NestJS dependency injection, we need to provide a way for them to get a reference to the event store and this is
     * the method that does that. It takes an aggregate root object and returns the same object but with a publish method attached to it.
     * @param aggregateRoot The aggregate root object to which we want to add a publish method.
     */
    addPublisher<T extends AggregateRoot>(aggregateRoot: T): T;

    /**
     * Finds the version of the aggregate root object that is associated with the provided id. If the aggregate root is not found
     * or there's no version information, the method will return -1
     * @param id The id of the aggregate root object
     */
    findAggregateRootVersion(id: string): Promise<number>;

    /**
     * Finds all events that are associated with the provided aggregate root id and match the aggregate root name which
     * is resolved from the aggregate root class. These events can later be used to recreate an aggregate root object.
     * @param aggregateRootClass The class of the aggregate root for which the store will search for events
     * @param id The unique id of the aggregate root object
     * @returns An array of events that are associated with the provided id
     */
    findByAggregateRootId<T extends AggregateRoot>(
        aggregateRootClass: AggregateRootClass<T>,
        id: string
    ): Promise<Array<StoredEvent>>;

    /**
     * Finds all events that are associated with the provided aggregate root ids and match the aggregate root name which
     * is resolved from the aggregate root class. These events can later be used to recreate an aggregate root object.
     * @param aggregateRootClass The class of the aggregate root for which the store will search for events
     * @param ids The unique ids of the aggregate root objects
     * @returns A map where the key is the aggregate root id and the value is an array of events that are associated with that id
     */
    findByAggregateRootIds<T extends AggregateRoot>(
        aggregateRootClass: AggregateRootClass<T>,
        ids: string[]
    ): Promise<Record<string, Array<StoredEvent>>>;

    /**
     * Finds a snapshot and all events that occurred after that snapshot for the specified aggregate root.
     * This method retrieves the most recent stored snapshot (obtained from the aggregate's `.toSnapshot()` method)
     * and returns it along with all events that were stored after the snapshot was written to the database.
     *
     * @param aggregateRootClass The snapshot-aware aggregate root class that has a static `snapshotRevision` property and implements SnapshotAware interface
     * @param id The unique id of the aggregate root object
     * @returns An object containing the snapshot and an array of events that occurred after the snapshot
     * @throws {MissingAggregateRootNameException} If no `@AggregateRootName` decorator is attached to the aggregateRootClass
     * @throws {NoSnapshotFoundException} If no snapshot is found for the aggregate root with the specified id
     * @throws {SnapshotRevisionMismatchException} If the static `snapshotRevision` property on the aggregate class does not match the snapshot revision in the stored snapshot record
     */
    findWithSnapshot<T extends AggregateRoot>(
        aggregateRootClass: SnapshotAwareAggregateClass<T>,
        id: string
    ): Promise<{
        events: Array<StoredEvent>;
        snapshot: AggregateRootSnapshot<T>;
    }>;

    /**
     * Each storage solution has its own way of dealing with unique ids. This method's implementation should reflect
     * the way the storage solution generates unique ids. For example, in a MongoDB database this would usually return
     * a String representation of a MongoDB ObjectId.
     */
    generateEntityId(): Promise<string>;

    /**
     * Saves the provided event and aggregate root object. Before saving the aggregate root object, the method will check
     * if the version of the aggregate root object is the same as the version of the aggregate root object in the database.
     * If there's a version mismatch, the method will throw an exception. Otherwise, the method will increase the version
     * of the aggregate root and then proceed to save the aggregate root and the event objects.
     * @param events The events to save
     * @param aggregate The aggregate root object that matches the events
     */
    save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>>;
}
