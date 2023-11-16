export interface CoreModuleOptions {
    /**
     * Each domain event that is saved in the store will then be passed to any classes you have registered with the
     * {@link DomainEventSubscription} decorator.
     * By default, the events will be processed sequentially to make sure that a subscription can count on the fact that
     * the previous event has been processed. If you don't need this functionality, and you want faster event processing,
     * you can set this to true.
     *
     */
    concurrentSubscriptions?: boolean;
}
