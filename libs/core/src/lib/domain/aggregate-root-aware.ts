export interface AggregateRootAware<T> {
    aggregateRootId: string;
    payload: T;
}
