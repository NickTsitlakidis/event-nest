import { DomainEvent } from "./domain-event";
import { EventNameConflictException } from "./exceptions/event-name-conflict-exception";
import { isRegistered } from "./domain-event-registrations";

class TestClass1 {}

class TestClass2 {}

test("DomainEvent - throws for duplicate event names", () => {
    DomainEvent("event-one")(TestClass1);
    expect(() => DomainEvent("event-one")(TestClass2)).toThrow(EventNameConflictException);
    expect(isRegistered(new TestClass1())).toBe(true);
    expect(isRegistered(new TestClass2())).toBe(false);
});
