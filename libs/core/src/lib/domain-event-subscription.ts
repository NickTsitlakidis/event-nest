import { randomUUID } from "crypto";
import { Class } from "type-fest";

import { DOMAIN_EVENT_KEY, DOMAIN_EVENT_SUBSCRIPTION_KEY } from "./metadata-keys";
import { OnDomainEvent } from "./on-domain-event";
import { isNil } from "./utils/type-utils";

export const DomainEventSubscription = (...eventClasses: Class<unknown>[]): ClassDecorator => {
    return (target: object) => {
        eventClasses.forEach((event) => {
            if (!Reflect.hasOwnMetadata(DOMAIN_EVENT_KEY, event)) {
                Reflect.defineMetadata(
                    DOMAIN_EVENT_KEY,
                    { eventSubscriptionId: `${event.name}-${randomUUID()}` },
                    event
                );
            }
        });

        Reflect.defineMetadata(DOMAIN_EVENT_SUBSCRIPTION_KEY, { events: eventClasses }, target);
    };
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function getEventId(eventConstructor: Function): string | undefined {
    return Reflect.getMetadata(DOMAIN_EVENT_KEY, eventConstructor)?.eventSubscriptionId;
}

export function getEventsFromDomainEventSubscription(subscriptionInstance: OnDomainEvent<unknown>): any[] {
    const metadata = Reflect.getMetadata(DOMAIN_EVENT_SUBSCRIPTION_KEY, subscriptionInstance.constructor);
    return isNil(metadata) ? [] : metadata.events;
}

export function isDomainEventSubscription(targetInstance: object): boolean {
    const hasMetadata = Reflect.hasOwnMetadata(DOMAIN_EVENT_SUBSCRIPTION_KEY, targetInstance.constructor);
    return hasMetadata && typeof (targetInstance as OnDomainEvent<unknown>).onDomainEvent === "function";
}
