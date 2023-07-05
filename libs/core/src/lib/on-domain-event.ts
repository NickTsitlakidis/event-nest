import { AggregateRootAwareEvent } from "./aggregate-root-aware-event";

export interface OnDomainEvent<T> {
    onDomainEvent(event: AggregateRootAwareEvent<T>): Promise<unknown>;
}
