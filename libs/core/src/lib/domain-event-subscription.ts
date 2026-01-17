import { isNil, isPlainObject, uniq } from "es-toolkit";
import { randomUUID } from "node:crypto";

import { DOMAIN_EVENT_KEY, DOMAIN_EVENT_SUBSCRIPTION_KEY } from "./metadata-keys";
import { OnDomainEvent } from "./on-domain-event";
import { Class } from "./utils/type-utils";

type SubscriptionConfiguration = {
    /**
     * The event classes that the subscription listens to.
     */
    eventClasses: Class<unknown>[];
    /**
     * Setting isAsync to false will make the rest of the commit process to wait for the subscription to finish.
     * Default is true.
     */
    isAsync?: boolean;
};

export function DomainEventSubscription(...eventClasses: Class<unknown>[]): ClassDecorator;
export function DomainEventSubscription(config: SubscriptionConfiguration): ClassDecorator;
export function DomainEventSubscription(
    configOrEventClass: Class<unknown> | SubscriptionConfiguration,
    ...eventClasses: Class<unknown>[]
): ClassDecorator {
    const actualEventClasses = isPlainObject(configOrEventClass)
        ? (configOrEventClass as SubscriptionConfiguration).eventClasses
        : [configOrEventClass, ...eventClasses];

    let isAsync = true;
    if (isPlainObject(configOrEventClass)) {
        isAsync = (configOrEventClass as SubscriptionConfiguration).isAsync ?? true;
    }

    const uniqueEventClasses = uniq(actualEventClasses);
    return (target: object) => {
        for (const event of uniqueEventClasses) {
            if (!Reflect.hasOwnMetadata(DOMAIN_EVENT_KEY, event)) {
                Reflect.defineMetadata(
                    DOMAIN_EVENT_KEY,
                    { eventSubscriptionId: `${event.name}-${randomUUID()}` },
                    event
                );
            }
        }

        Reflect.defineMetadata(DOMAIN_EVENT_SUBSCRIPTION_KEY, { events: uniqueEventClasses, isAsync }, target);
    };
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function getEventId(eventConstructor: Function): string | undefined {
    return Reflect.getMetadata(DOMAIN_EVENT_KEY, eventConstructor)?.eventSubscriptionId;
}

export function getEventsFromDomainEventSubscription(subscriptionInstance: OnDomainEvent<unknown>): any[] {
    const metadata = Reflect.getMetadata(DOMAIN_EVENT_SUBSCRIPTION_KEY, subscriptionInstance.constructor);
    return isNil(metadata) ? [] : metadata.events;
}

export function getSubscriptionAsyncType(subscriptionInstance: OnDomainEvent<unknown>): boolean {
    const metadata = Reflect.getMetadata(DOMAIN_EVENT_SUBSCRIPTION_KEY, subscriptionInstance.constructor);
    return isNil(metadata) ? true : metadata.isAsync;
}

export function isDomainEventSubscription(targetInstance: object): boolean {
    const hasMetadata = Reflect.hasOwnMetadata(DOMAIN_EVENT_SUBSCRIPTION_KEY, targetInstance.constructor);
    return hasMetadata && typeof (targetInstance as OnDomainEvent<unknown>).onDomainEvent === "function";
}
