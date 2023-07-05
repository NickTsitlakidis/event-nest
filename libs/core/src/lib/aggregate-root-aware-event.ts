export interface AggregateRootAwareEvent<T> {
    aggregateRootId: string;
    payload: T;
}
