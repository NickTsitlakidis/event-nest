import "reflect-metadata";
const randomUUID = jest.fn();
jest.mock("node:crypto", () => {
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
import { DOMAIN_EVENT_KEY, DOMAIN_EVENT_SUBSCRIPTION_KEY } from "./metadata-keys";
import { OnDomainEvent } from "./on-domain-event";

randomUUID.mockReturnValue("the-id");

class DomainEvent1 {}

@DomainEventSubscription(DomainEvent1)
class NoInterfaceSubscription {}

class UnusedEvent {}

@DomainEventSubscription(DomainEvent1)
class WithDecorator implements OnDomainEvent<DomainEvent1> {
    onDomainEvent(): Promise<unknown> {
        return Promise.resolve();
    }
}

class WithoutDecorator implements OnDomainEvent<DomainEvent1> {
    onDomainEvent(): Promise<unknown> {
        return Promise.resolve();
    }
}

describe("DomainEventSubscription tests", () => {
    test("adds metadata to handler and event", () => {
        const metadata = Reflect.getMetadata(DOMAIN_EVENT_SUBSCRIPTION_KEY, new WithDecorator().constructor);
        expect(metadata).toBeDefined();
        expect(metadata.events).toEqual([DomainEvent1]);

        const eventId = Reflect.getMetadata(DOMAIN_EVENT_KEY, DomainEvent1);
        expect(eventId).toBeDefined();
        expect(eventId.eventSubscriptionId).toBe("DomainEvent1-the-id");
    });

    test("adds same id if called for the same event", () => {
        randomUUID.mockReturnValueOnce("one");

        class OtherEvent {}
        class Sub1 {}
        class Sub2 {}
        DomainEventSubscription(OtherEvent)(Sub1);

        randomUUID.mockReturnValueOnce("two");
        DomainEventSubscription(OtherEvent)(Sub2);

        expect(Reflect.getMetadata(DOMAIN_EVENT_KEY, OtherEvent).eventSubscriptionId).toBe("OtherEvent-one");
    });
});

describe("isDomainEventSubscription tests", () => {
    test("returns false if not decorated", () => {
        expect(isDomainEventSubscription(new WithoutDecorator())).toBe(false);
    });

    test("returns false if not implementing interface", () => {
        expect(isDomainEventSubscription(new NoInterfaceSubscription())).toBe(false);
    });

    test("returns true if decorated and has interface", () => {
        expect(isDomainEventSubscription(new WithDecorator())).toBe(true);
    });
});

describe("getEventId tests", () => {
    test("returns undefined if no metadata", () => {
        expect(getEventId(new UnusedEvent().constructor)).toBeUndefined();
    });

    test("returns id based on metadata", () => {
        expect(getEventId(new DomainEvent1().constructor)).toBe("DomainEvent1-the-id");
    });
});

describe("getEventsFromDomainEventSubscription tests", () => {
    test("returns events from metadata", () => {
        expect(getEventsFromDomainEventSubscription(new WithDecorator())).toEqual([DomainEvent1]);
    });

    test("returns empty array if no metadata", () => {
        expect(getEventsFromDomainEventSubscription(new WithoutDecorator())).toEqual([]);
    });
});
