import { AggregateRootAwareEvent } from "./aggregate-root-aware-event";

/**
 * A basic interface that can be implemented by nest.js services to make sure
 * that they can be called by the {@link DomainEventEmitter} when a domain event is emitted.
 * The service also has to be decorated with the {@link DomainEventSubscription} decorator.
 */
export interface OnDomainEvent<T> {
    /**
     * Called by the {@link DomainEventEmitter} when a domain event is emitted.
     * @param event The domain event that was emitted along with the id of the aggregate root that emitted it.
     */
    onDomainEvent(event: AggregateRootAwareEvent<T>): Promise<unknown>;
}
