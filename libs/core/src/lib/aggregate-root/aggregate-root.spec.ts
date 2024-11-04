import { Logger } from "@nestjs/common";

import { DomainEvent } from "../domain-event";
import { UnknownEventException } from "../exceptions/unknown-event-exception";
import { UnregisteredEventException } from "../exceptions/unregistered-event-exception";
import { StoredEvent } from "../storage/stored-event";
import { AggregateRoot } from "./aggregate-root";
import { AggregateRootEvent } from "./aggregate-root-event";
import { ApplyEvent } from "./apply-event.decorator";

@DomainEvent("test-event-1")
class TestEvent1 {}

@DomainEvent("test-event-2")
class TestEvent2 {}

@DomainEvent("test-event-for-this-binding")
class TestEventForThisBinding {}

@DomainEvent("throwing-event")
class ThrowingEvent {}

class UnregisteredEvent {}

class SubEntity extends AggregateRoot {
    @ApplyEvent(TestEvent1)
    applyTestEvent1 = () => {};
    @ApplyEvent(TestEvent2)
    applyTestEvent2 = () => {};

    @ApplyEvent(ThrowingEvent)
    applyThrowingEvent = () => {
        throw new Error("ooops");
    };

    public published: Array<AggregateRootEvent<object>> = [];

    someProperty!: string;

    constructor(id: string) {
        super(id);
    }

    @ApplyEvent(TestEventForThisBinding)
    applyThisBindingEvent() {
        this.someProperty = "test";
    }

    override publish(events: Array<AggregateRootEvent<object>>): Promise<Array<StoredEvent>> {
        this.published = events;
        return Promise.resolve([]);
    }

    public override resolveVersion(events: Array<StoredEvent>) {
        super.resolveVersion(events);
    }

    public override sortEvents(events: Array<StoredEvent>): Array<StoredEvent> {
        return super.sortEvents(events);
    }
}

beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date("2020-01-01"));
});

afterAll(() => {
    jest.useRealTimers();
});

class SubEntity2 extends AggregateRoot {
    constructor(id: string) {
        super(id, new Logger(SubEntity2.name));
    }
}

describe("constructor tests", () => {
    test("initializes values", () => {
        const entity = new SubEntity("entity-id");
        expect(entity.appendedEvents).toEqual([]);
        expect(entity.id).toBe("entity-id");
        expect(entity.version).toBe(0);
    });
});

describe("reconstitute tests", () => {
    test("calls mapped apply methods after sorting", () => {
        const ev1 = StoredEvent.fromStorage("ev1", "id1", "test-event-2", new Date(), 10, "ag-name", {});
        const ev2 = StoredEvent.fromStorage("ev2", "id1", "test-event-1", new Date(), 2, "ag-name", {});

        const entity = new SubEntity("id1");

        let last = 0;
        const processor1Spy = jest.spyOn(entity, "applyTestEvent2").mockImplementation(() => {
            last = 1;
        });
        const processor2Spy = jest.spyOn(entity, "applyTestEvent1").mockImplementation(() => {
            last = 2;
        });

        entity.reconstitute([ev1, ev2]);

        expect(processor1Spy).toHaveBeenCalledTimes(1);
        expect(processor1Spy).toHaveBeenCalledWith(ev1.getPayloadAs(TestEvent2));

        expect(processor2Spy).toHaveBeenCalledTimes(1);
        expect(processor2Spy).toHaveBeenCalledWith(ev2.getPayloadAs(TestEvent1));

        expect(last).toBe(1);
    });

    test("throws when an event applier throws", () => {
        const ev1 = StoredEvent.fromStorage("ev1", "id1", "throwing-event", new Date(), 10, "ag-name", {});
        const entity = new SubEntity("id1");
        expect(() => entity.reconstitute([ev1])).toThrow();
    });

    test("throws when an event has no matching handler", () => {
        const ev1 = StoredEvent.fromStorage("ev1", "id1", "test-event-1", new Date(), 10, "ag-name", {});
        const ev3 = StoredEvent.fromStorage("ev3", "id1", "test-event-3", new Date(), 10, "ag-name", {});

        const entity = new SubEntity("id1");

        const processor1Spy = jest.spyOn(entity, "applyTestEvent1").mockImplementation(() => {});
        const processor2Spy = jest.spyOn(entity, "applyTestEvent2").mockImplementation(() => {});

        expect(() => entity.reconstitute([ev1, ev3])).toThrow(UnknownEventException);

        expect(processor1Spy).not.toHaveBeenCalled();
        expect(processor2Spy).not.toHaveBeenCalled();
    });

    test("throws when an event is not registered", () => {
        const ev1 = StoredEvent.fromStorage("ev1", "id1", "test-event-1", new Date(), 10, "ag-name", {});
        const ev3 = StoredEvent.fromStorage("ev3", "id1", "other", new Date(), 12, "ag-name", {});

        const entity = new SubEntity("id1");

        const processor1Spy = jest.spyOn(entity, "applyTestEvent1").mockImplementation(() => {});
        const processor2Spy = jest.spyOn(entity, "applyTestEvent2").mockImplementation(() => {});

        expect(() => entity.reconstitute([ev1, ev3])).toThrow(UnknownEventException);

        expect(processor1Spy).not.toHaveBeenCalled();
        expect(processor2Spy).not.toHaveBeenCalled();
    });

    test("works with non-fat-arrow apply methods", () => {
        const ev1 = StoredEvent.fromStorage("ev1", "id1", "test-event-for-this-binding", new Date(), 10, "ag-name", {});

        const entity = new SubEntity("id1");

        entity.reconstitute([ev1]);

        expect(entity.someProperty).toBe("test");
    });
});

describe("append tests", () => {
    test("throws when event is not registered", () => {
        const entity = new SubEntity("entity-id");
        expect(() => entity.append(new UnregisteredEvent())).toThrow(
            new UnregisteredEventException(UnregisteredEvent.name)
        );
    });

    test("adds event to array", () => {
        const entity = new SubEntity("entity-id");
        const event = new TestEvent2();
        entity.append(event);

        expect(entity.appendedEvents.length).toBe(1);
        expect(
            entity.appendedEvents.findIndex(
                (appended) => appended.aggregateRootId === "entity-id" && appended.payload === event
            )
        ).toBe(0);
    });

    test("adds multiple events to array", () => {
        const entity = new SubEntity("entity-id");
        const event1 = new TestEvent2();
        const event2 = new TestEvent2();
        entity.append(event1);
        entity.append(event2);

        expect(entity.appendedEvents.length).toBe(2);
        expect(
            entity.appendedEvents.findIndex(
                (appended) => appended.aggregateRootId === "entity-id" && appended.payload === event1
            )
        ).toBe(0);

        expect(
            entity.appendedEvents.findIndex(
                (appended) => appended.aggregateRootId === "entity-id" && appended.payload === event2
            )
        ).toBe(1);
    });
});

describe("commit tests", () => {
    test("returns for no appended events", async () => {
        const entity = new SubEntity("entity-id");

        const result = await entity.commit();
        expect(result.appendedEvents.length).toBe(0);
        expect((result as SubEntity).published).toEqual([]);
    });

    test("does not clear appended events if commit fails", async () => {
        const entity = new SubEntity("entity-id");
        const event1 = new TestEvent2();
        const event2 = new TestEvent2();
        entity.append(event1);
        entity.append(event2);

        entity.publish = () => Promise.reject("error");

        try {
            await entity.commit();
            expect(fail("Should have thrown"));
        } catch (error) {
            expect(entity.appendedEvents.length).toBe(2);
            expect((entity as SubEntity).published).toEqual([]);
        }
    });

    test("publishes and clears appended events", async () => {
        const entity = new SubEntity("entity-id");
        const event1 = new TestEvent2();
        const event2 = new TestEvent2();
        entity.append(event1);
        entity.append(event2);

        const result = await entity.commit();
        expect(result.appendedEvents.length).toBe(0);
        expect((result as SubEntity).published).toEqual([
            {
                aggregateRootId: "entity-id",
                occurredAt: new Date("2020-01-01"),
                payload: event1
            },
            {
                aggregateRootId: "entity-id",
                occurredAt: new Date("2020-01-01"),
                payload: event2
            }
        ]);
    });
});

test("publish - throws when publisher is missing", (endTest) => {
    new SubEntity2("id").publish([]).catch((error) => {
        expect(error).toBe("There is no event publisher assigned");
        endTest();
    });
});

test("sortEvents - sorts multiple events by version", () => {
    const ev1 = StoredEvent.fromPublishedEvent("ev1", "id1", "ag-name", new TestEvent1(), new Date());
    ev1.aggregateRootVersion = 5;
    const ev2 = StoredEvent.fromPublishedEvent("ev2", "id1", "ag-name", new TestEvent1(), new Date());
    ev2.aggregateRootVersion = 1;
    const ev3 = StoredEvent.fromPublishedEvent("ev3", "id1", "ag-name", new TestEvent1(), new Date());
    ev3.aggregateRootVersion = 41;

    const sorted = new SubEntity("id").sortEvents([ev1, ev2, ev3]);
    expect(sorted).toEqual([ev2, ev1, ev3]);
});

test("resolveVersion - finds greatest version for multiple events", () => {
    const ev1 = StoredEvent.fromPublishedEvent("ev1", "id1", "ag-name", new TestEvent1(), new Date());
    ev1.aggregateRootVersion = 10;
    const ev2 = StoredEvent.fromPublishedEvent("ev2", "id1", "ag-name", new TestEvent1(), new Date());
    ev2.aggregateRootVersion = 5;
    const ev3 = StoredEvent.fromPublishedEvent("ev3", "id1", "ag-name", new TestEvent1(), new Date());
    ev3.aggregateRootVersion = 30;

    const entity = new SubEntity("id");
    entity.resolveVersion([ev1, ev2, ev3]);
    expect(entity.version).toBe(30);
});
