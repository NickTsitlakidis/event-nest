import { EventConcurrencyException } from "./event-concurrency-exception";
import { EventNestException, isEventNestError } from "./event-nest-exception";

describe("EventNestException", () => {
    test("formats the message and exposes the error name and code", () => {
        const exception = new EventNestException("TestException", "1234", "test message");

        expect(exception.message).toBe("TestException (1234): test message");
        expect(exception.errorName).toBe("TestException");
        expect(exception.errorCode).toBe("1234");
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
    });

    test("is branded with the global event nest error symbol", () => {
        const exception = new EventNestException("TestException", "1234", "test message");

        expect((exception as unknown as Record<symbol, unknown>)[Symbol.for("@event-nest/error")]).toBe(true);
    });

    test("does not expose the brand in JSON", () => {
        const exception = new EventNestException("TestException", "1234", "test message");

        expect(JSON.stringify(exception)).not.toContain("event-nest/error");
    });
});

describe("isEventNestError", () => {
    test("returns true for an EventNestException", () => {
        expect(isEventNestError(new EventNestException("TestException", "1234", "test message"))).toBe(true);
    });

    test("returns true for a subclass of EventNestException", () => {
        expect(isEventNestError(new EventConcurrencyException("aggregate-123", 4, 5))).toBe(true);
    });

    test("returns true for an object branded by another copy of the package", () => {
        const foreignError = Object.assign(new Error("foreign"), { [Symbol.for("@event-nest/error")]: true });

        expect(foreignError).not.toBeInstanceOf(EventNestException);
        expect(isEventNestError(foreignError)).toBe(true);
    });

    test("returns false for a plain Error", () => {
        expect(isEventNestError(new Error("test"))).toBe(false);
    });

    test("returns false for an error with a look-alike error code", () => {
        expect(isEventNestError(Object.assign(new Error("test"), { errorCode: "en_1001" }))).toBe(false);
    });

    test("returns false for an error branded with a non-true value", () => {
        expect(isEventNestError(Object.assign(new Error("test"), { [Symbol.for("@event-nest/error")]: "yes" }))).toBe(
            false
        );
    });

    // eslint-disable-next-line unicorn/no-null
    test.each([undefined, null, "error", 42, true])("returns false for %p", (value) => {
        expect(isEventNestError(value)).toBe(false);
    });
});
