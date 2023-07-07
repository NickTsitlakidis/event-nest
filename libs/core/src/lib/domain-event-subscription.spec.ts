import "reflect-metadata";
const randomUUID = jest.fn();
jest.mock("crypto", () => {
    return {
        randomUUID
    };
});
import {
    DomainEventSubscription,
    getEventId,
    getEventsFromDomainEventSubscription,
    isDomainEventSubscription
} from "./domain-event-subscription";
import { OnDomainEvent } from "./on-domain-event";
import { DOMAIN_EVENT_KEY, DOMAIN_EVENT_SUBSCRIPTION_KEY } from "./metadata-keys";

randomUUID.mockReturnValue("the-id");

class TheEvent {}

class UnusedEvent {}

@DomainEventSubscription(TheEvent)
class DecoratedSubscription implements OnDomainEvent<TheEvent> {
    onDomainEvent(): Promise<unknown> {
        return Promise.resolve(undefined);
    }
}

class UndecoratedSubscription implements OnDomainEvent<TheEvent> {
    onDomainEvent(): Promise<unknown> {
        return Promise.resolve(undefined);
    }
}

@DomainEventSubscription(TheEvent)
class NoInterfaceSubscription {}

describe("DomainEventSubscription tests", () => {
    test("adds metadata to handler and event", () => {
        const metadata = Reflect.getMetadata(DOMAIN_EVENT_SUBSCRIPTION_KEY, new DecoratedSubscription().constructor);
        expect(metadata).toBeDefined();
        expect(metadata.events).toEqual([TheEvent]);

        const eventId = Reflect.getMetadata(DOMAIN_EVENT_KEY, TheEvent);
        expect(eventId).toBeDefined();
        expect(eventId.eventSubscriptionId).toBe("the-id");
    });

    test("adds same id if called for the same event", () => {
        randomUUID.mockReturnValueOnce("one");

        class OtherEvent {}
        class Sub1 {}
        class Sub2 {}
        DomainEventSubscription(OtherEvent)(Sub1);

        randomUUID.mockReturnValueOnce("two");
        DomainEventSubscription(OtherEvent)(Sub2);

        expect(Reflect.getMetadata(DOMAIN_EVENT_KEY, OtherEvent).eventSubscriptionId).toBe("one");
    });
});

describe("isDomainEventSubscription tests", () => {
    test("returns false if not decorated", () => {
        expect(isDomainEventSubscription(new UndecoratedSubscription())).toBe(false);
    });

    test("returns false if not implementing interface", () => {
        expect(isDomainEventSubscription(new NoInterfaceSubscription())).toBe(false);
    });

    test("returns true if decorated and has interface", () => {
        expect(isDomainEventSubscription(new DecoratedSubscription())).toBe(true);
    });
});

describe("getEventId tests", () => {
    test("returns undefined if no metadata", () => {
        expect(getEventId(new UnusedEvent().constructor)).toBeUndefined();
    });

    test("returns id based on metadata", () => {
        expect(getEventId(new TheEvent().constructor)).toBe("the-id");
    });
});

describe("getEventsFromDomainEventSubscription tests", () => {
    test("returns events from metadata", () => {
        expect(getEventsFromDomainEventSubscription(new DecoratedSubscription())).toEqual([TheEvent]);
    });

    test("returns empty array if no metadata", () => {
        expect(getEventsFromDomainEventSubscription(new UndecoratedSubscription())).toEqual([]);
    });
});
