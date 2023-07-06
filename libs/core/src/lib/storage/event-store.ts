import { StoredEvent } from "./stored-event";
import { StoredAggregateRoot } from "./stored-aggregate-root";
import { AggregateRoot } from "../aggregate-root";

// eslint-disable-next-line @typescript-eslint/ban-types
export type AggregateRootClass<T> = Function & { prototype: T };

export /**
 * A unique symbol that can be used to inject the event store into other classes.
 */
const EVENT_STORE = Symbol("EVENT_NEST_EVENT_STORE");

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
     * Finds all events that are associated with the provided aggregate root id and match the aggregate root name which
     * is resolved from the aggregate root class. These events can later be used to recreate an aggregate root object.
     * @param aggregateRootClass The class of the aggregate root for which the store will search for events
     * @param id The unique id of the aggregate root object
     */
    findByAggregateRootId<T extends AggregateRoot>(
        aggregateRootClass: AggregateRootClass<T>,
        id: string
    ): Promise<Array<StoredEvent>>;

    /**
     * Saves the provided event and aggregate root object. Before saving the aggregate root object, the method will check
     * if the version of the aggregate root object is the same as the version of the aggregate root object in the database.
     * If there's a version mismatch, the method will throw an exception. Otherwise, the method will increase the version
     * of the aggregate root and then proceed to save the aggregate root and the event objects.
     * @param events The events to save
     * @param aggregate The aggregate root object that matches the events
     */
    save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>>;

    /**
     * Each storage solution has its own way of dealing with unique ids. This method's implementation should reflect
     * the way the storage solution generates unique ids. For example, in a MongoDB database this would usually return
     * a String representation of a MongoDB ObjectId.
     */
    generateEntityId(): Promise<string>;
}
