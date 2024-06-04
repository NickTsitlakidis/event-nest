import { AggregateRootEvent } from "./aggregate-root/aggregate-root-event";

/**
 * Represents an event that has passed through an aggregate root and it has been commited and published to the event store.
 */
export interface PublishedDomainEvent<T> extends AggregateRootEvent<T> {
    /**
     * The unique id of the event
     */
    eventId: string;

    /**
     * The version of the aggregate root that published the event
     */
    version: number;
}
