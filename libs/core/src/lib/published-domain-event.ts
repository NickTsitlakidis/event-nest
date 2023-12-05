import { AggregateRootEvent } from "./aggregate-root/aggregate-root-event";

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
