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
    getSubscriptionAsyncType,
    isDomainEventSubscription
} from "./domain-event-subscription";
import { DOMAIN_EVENT_KEY, DOMAIN_EVENT_SUBSCRIPTION_KEY } from "./metadata-keys";
import { OnDomainEvent } from "./on-domain-event";

randomUUID.mockReturnValue("the-id");

class DomainEvent1 {}

class DomainEvent2 {}

@DomainEventSubscription(DomainEvent1)
class NoInterfaceSubscription {}

class UnusedEvent {}

@DomainEventSubscription({ eventClasses: [DomainEvent1], isAsync: false })
class WithAsyncConfigurationFalse {
    onDomainEvent(): Promise<unknown> {
        return Promise.resolve();
    }
}

@DomainEventSubscription({ eventClasses: [DomainEvent1] })
class WithAsyncConfigurationMissing {
    onDomainEvent(): Promise<unknown> {
        return Promise.resolve();
    }
}

@DomainEventSubscription({ eventClasses: [DomainEvent1], isAsync: true })
class WithAsyncConfigurationTrue {
    onDomainEvent(): Promise<unknown> {
        return Promise.resolve();
    }
}

@DomainEventSubscription(DomainEvent1)
class WithDecorator implements OnDomainEvent<DomainEvent1> {
    onDomainEvent(): Promise<unknown> {
        return Promise.resolve();
    }
}

@DomainEventSubscription(DomainEvent1, DomainEvent2)
class WithMultipleEvents implements OnDomainEvent<DomainEvent1 | DomainEvent2> {
    onDomainEvent(): Promise<unknown> {
        return Promise.resolve();
    }
}

class WithoutDecorator implements OnDomainEvent<DomainEvent1> {
    onDomainEvent(): Promise<unknown> {
        return Promise.resolve();
    }
}

describe("DomainEventSubscription", () => {
    test("adds metadata for multiple events when using rest parameters", () => {
        const metadata = Reflect.getMetadata(DOMAIN_EVENT_SUBSCRIPTION_KEY, new WithMultipleEvents().constructor);
        expect(metadata).toBeDefined();
        expect(metadata.events).toEqual([DomainEvent1, DomainEvent2]);
        expect(metadata.isAsync).toBe(true);

        const eventId = Reflect.getMetadata(DOMAIN_EVENT_KEY, DomainEvent1);
        expect(eventId).toBeDefined();
        expect(eventId.eventSubscriptionId).toBe("DomainEvent1-the-id");

        const eventId2 = Reflect.getMetadata(DOMAIN_EVENT_KEY, DomainEvent2);
        expect(eventId2).toBeDefined();
        expect(eventId2.eventSubscriptionId).toBe("DomainEvent2-the-id");
    });

    test("adds metadata to handler and event when using only rest parameters", () => {
        const metadata = Reflect.getMetadata(DOMAIN_EVENT_SUBSCRIPTION_KEY, new WithDecorator().constructor);
        expect(metadata).toBeDefined();
        expect(metadata.events).toEqual([DomainEvent1]);
        expect(metadata.isAsync).toBe(true);

        const eventId = Reflect.getMetadata(DOMAIN_EVENT_KEY, DomainEvent1);
        expect(eventId).toBeDefined();
        expect(eventId.eventSubscriptionId).toBe("DomainEvent1-the-id");
    });

    test("adds metadata to handler and event when using configuration without async", () => {
        const metadata = Reflect.getMetadata(
            DOMAIN_EVENT_SUBSCRIPTION_KEY,
            new WithAsyncConfigurationMissing().constructor
        );
        expect(metadata).toBeDefined();
        expect(metadata.events).toEqual([DomainEvent1]);
        expect(metadata.isAsync).toBe(true);

        const eventId = Reflect.getMetadata(DOMAIN_EVENT_KEY, DomainEvent1);
        expect(eventId).toBeDefined();
        expect(eventId.eventSubscriptionId).toBe("DomainEvent1-the-id");
    });

    test("adds metadata to handler and event when using configuration with async false", () => {
        const metadata = Reflect.getMetadata(
            DOMAIN_EVENT_SUBSCRIPTION_KEY,
            new WithAsyncConfigurationFalse().constructor
        );
        expect(metadata).toBeDefined();
        expect(metadata.events).toEqual([DomainEvent1]);
        expect(metadata.isAsync).toBe(false);

        const eventId = Reflect.getMetadata(DOMAIN_EVENT_KEY, DomainEvent1);
        expect(eventId).toBeDefined();
        expect(eventId.eventSubscriptionId).toBe("DomainEvent1-the-id");
    });

    test("adds metadata to handler and event when using configuration with async true", () => {
        const metadata = Reflect.getMetadata(
            DOMAIN_EVENT_SUBSCRIPTION_KEY,
            new WithAsyncConfigurationTrue().constructor
        );
        expect(metadata).toBeDefined();
        expect(metadata.events).toEqual([DomainEvent1]);
        expect(metadata.isAsync).toBe(true);

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

describe("isDomainEventSubscription", () => {
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

describe("getEventId", () => {
    test("returns undefined if no metadata", () => {
        expect(getEventId(new UnusedEvent().constructor)).toBeUndefined();
    });

    test("returns id based on metadata", () => {
        expect(getEventId(new DomainEvent1().constructor)).toBe("DomainEvent1-the-id");
    });
});

describe("getEventsFromDomainEventSubscription", () => {
    test("returns events from metadata", () => {
        expect(getEventsFromDomainEventSubscription(new WithDecorator())).toEqual([DomainEvent1]);
    });

    test("returns empty array if no metadata", () => {
        expect(getEventsFromDomainEventSubscription(new WithoutDecorator())).toEqual([]);
    });
});

describe("getSubscriptionAsyncType", () => {
    test("returns true if no metadata", () => {
        expect(getSubscriptionAsyncType(new WithoutDecorator())).toBe(true);
    });

    test("returns true if metadata is missing", () => {
        expect(getSubscriptionAsyncType(new WithAsyncConfigurationMissing())).toBe(true);
    });

    test("returns false if metadata is false", () => {
        expect(getSubscriptionAsyncType(new WithAsyncConfigurationFalse())).toBe(false);
    });

    test("returns true if metadata is true", () => {
        expect(getSubscriptionAsyncType(new WithAsyncConfigurationTrue())).toBe(true);
    });
});
