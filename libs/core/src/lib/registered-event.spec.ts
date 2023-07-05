import { isRegistered, RegisteredEvent } from "./registered-event";
import { EventNameConflictException } from "./exceptions/event-name-conflict-exception";

class TestClass1 {}

class TestClass2 {}

test("SerializedEvent - throws for duplicate event names", () => {
    RegisteredEvent("event-one")(TestClass1);
    expect(() => RegisteredEvent("event-one")(TestClass2)).toThrow(EventNameConflictException);
    expect(isRegistered(new TestClass1())).toBe(true);
    expect(isRegistered(new TestClass2())).toBe(false);
});
