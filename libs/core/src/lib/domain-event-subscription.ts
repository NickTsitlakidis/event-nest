import { DOMAIN_EVENT_KEY, DOMAIN_EVENT_SUBSCRIPTION_KEY } from "./metadata-keys";
import { randomUUID } from "crypto";
import { OnDomainEvent } from "./on-domain-event";
import { isNil } from "./utils/type-utils";

export const DomainEventSubscription = (...events: any[]): ClassDecorator => {
    return (target: object) => {
        events.forEach((event) => {
            if (!Reflect.hasOwnMetadata(DOMAIN_EVENT_KEY, event)) {
                Reflect.defineMetadata(DOMAIN_EVENT_KEY, { eventSubscriptionId: randomUUID() }, event);
            }
        });

        Reflect.defineMetadata(DOMAIN_EVENT_SUBSCRIPTION_KEY, { events }, target);
    };
};

export function isDomainEventSubscription(targetInstance: object): boolean {
    const hasMetadata = Reflect.hasOwnMetadata(DOMAIN_EVENT_SUBSCRIPTION_KEY, targetInstance.constructor);
    return hasMetadata && typeof (targetInstance as OnDomainEvent<unknown>).onDomainEvent === "function";
}

export function getEventsFromDomainEventSubscription(subscriptionInstance: OnDomainEvent<unknown>): any[] {
    const metadata = Reflect.getMetadata(DOMAIN_EVENT_SUBSCRIPTION_KEY, subscriptionInstance.constructor);
    return isNil(metadata) ? [] : metadata.events;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function getEventId(eventConstructor: Function): string | undefined {
    return Reflect.getMetadata(DOMAIN_EVENT_KEY, eventConstructor)?.eventSubscriptionId;
}
