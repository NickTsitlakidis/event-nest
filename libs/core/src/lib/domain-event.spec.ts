import { DomainEvent } from "./domain-event";
import { getEventClass, getEventName, isRegistered } from "./domain-event-registrations";
import { EventNameConflictException } from "./exceptions/event-name-conflict-exception";

class TestClass1 {}

class TestClass2 {}

class TestClass3 {}

class TestClass4 {}

class TestClass5 {}

class TestClass6 {}

class TestClass7 {}

class TestClass8 {}

class TestClass9 {}

describe("DomainEvent", () => {
    test("throws for duplicate event names", () => {
        DomainEvent("event-one")(TestClass1);
        expect(() => DomainEvent("event-one")(TestClass2)).toThrow(EventNameConflictException);
        expect(isRegistered(new TestClass1())).toBe(true);
        expect(isRegistered(new TestClass2())).toBe(false);
    });

    test("resolves the event class from the canonical name and from aliases", () => {
        DomainEvent("event-two", { aliases: ["event-two-legacy", "event-two-older"] })(TestClass3);
        expect(getEventClass("event-two")).toBe(TestClass3);
        expect(getEventClass("event-two-legacy")).toBe(TestClass3);
        expect(getEventClass("event-two-older")).toBe(TestClass3);
        expect(isRegistered(new TestClass3())).toBe(true);
    });

    test("returns the canonical name for events registered with aliases", () => {
        DomainEvent("event-three", { aliases: ["event-three-legacy"] })(TestClass4);
        expect(getEventName(new TestClass4())).toBe("event-three");
    });

    test("throws when an event name conflicts with a registered alias", () => {
        DomainEvent("event-four", { aliases: ["event-four-legacy"] })(TestClass5);
        expect(() => DomainEvent("event-four-legacy")(TestClass6)).toThrow(EventNameConflictException);
        expect(isRegistered(new TestClass6())).toBe(false);
    });

    test("throws when an alias conflicts with a registered event name", () => {
        DomainEvent("event-five")(TestClass7);
        expect(() => DomainEvent("event-six", { aliases: ["event-five"] })(TestClass8)).toThrow(
            EventNameConflictException
        );
        expect(isRegistered(new TestClass8())).toBe(false);
    });

    test("throws when an alias conflicts with a registered alias", () => {
        expect(() => DomainEvent("event-seven", { aliases: ["event-four-legacy"] })(TestClass8)).toThrow(
            EventNameConflictException
        );
        expect(isRegistered(new TestClass8())).toBe(false);
    });

    test("throws when an alias is duplicated within the same registration", () => {
        expect(() => DomainEvent("event-eight", { aliases: ["event-eight"] })(TestClass9)).toThrow(
            EventNameConflictException
        );
        expect(() =>
            DomainEvent("event-nine", { aliases: ["event-nine-legacy", "event-nine-legacy"] })(TestClass9)
        ).toThrow(EventNameConflictException);
        expect(isRegistered(new TestClass9())).toBe(false);
    });
});
