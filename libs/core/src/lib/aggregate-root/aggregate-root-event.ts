export interface AggregateRootEvent<T> {
    /**
     * The unique id of the aggregate root that published the event
     */
    aggregateRootId: string;

    /**
     * A UTC timestamp that defines when the event occurred.
     */
    occurredAt: Date;

    /**
     * The payload of the event. The type of this object depends on the events
     * you register using the {@link DomainEvent} decorator.
     */
    payload: T;
}
