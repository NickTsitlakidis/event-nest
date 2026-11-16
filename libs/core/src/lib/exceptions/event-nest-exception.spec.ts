import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventConcurrencyException } from "./event-concurrency-exception";
import { EventNestException, isEventNestException } from "./event-nest-exception";
import { SnapshotRevisionMismatchException } from "./snapshot-revision-mismatch-exception";

describe("EventNestException", () => {
    test("sets the name and exposes the error name and code", () => {
        const exception = new EventNestException("TestException", "1234", "test message");

        expect(exception.message).toBe("test message");
        expect(exception.name).toBe("TestException");
        expect(String(exception)).toBe("TestException: test message");
        expect(exception.errorCode).toBe("1234");
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
    });

    test("is branded with the global event nest error symbol", () => {
        const exception = new EventNestException("TestException", "1234", "test message");

        expect((exception as unknown as Record<symbol, unknown>)[Symbol.for("@event-nest/error")]).toBe(true);
    });

    test("serializes only the name and the error code to JSON", () => {
        const exception = new EventNestException("TestException", "1234", "test message");

        // The round trip is intentional: the assertion is about what JSON.stringify emits, not about cloning.
        // eslint-disable-next-line unicorn/prefer-structured-clone
        expect(JSON.parse(JSON.stringify(exception))).toEqual({ errorCode: "1234", name: "TestException" });
        expect(JSON.stringify(exception)).not.toContain("event-nest/error");
    });
});

describe("isEventNestException", () => {
    test("returns true for an EventNestException", () => {
        expect(isEventNestException(new EventNestException("TestException", "1234", "test message"))).toBe(true);
    });

    test("returns true for a subclass of EventNestException", () => {
        expect(isEventNestException(new EventConcurrencyException("aggregate-123", 4, 5))).toBe(true);
    });

    test("returns true for an object branded by another copy of the package", () => {
        const foreignError = Object.assign(new Error("foreign"), {
            errorCode: "en_1001",
            [Symbol.for("@event-nest/error")]: true
        });

        expect(foreignError).not.toBeInstanceOf(EventNestException);
        expect(isEventNestException(foreignError)).toBe(true);
    });

    test("returns false for a branded object without a string error code", () => {
        expect(
            isEventNestException(Object.assign(new Error("test"), { [Symbol.for("@event-nest/error")]: true }))
        ).toBe(false);
        expect(
            isEventNestException(
                Object.assign(new Error("test"), { errorCode: 1001, [Symbol.for("@event-nest/error")]: true })
            )
        ).toBe(false);
    });

    test("returns false for a plain Error", () => {
        expect(isEventNestException(new Error("test"))).toBe(false);
    });

    test("returns false for an error with a look-alike error code", () => {
        expect(isEventNestException(Object.assign(new Error("test"), { errorCode: "en_1001" }))).toBe(false);
    });

    test("returns false for an error branded with a non-true value", () => {
        expect(
            isEventNestException(Object.assign(new Error("test"), { [Symbol.for("@event-nest/error")]: "yes" }))
        ).toBe(false);
    });

    // eslint-disable-next-line unicorn/no-null
    test.each([undefined, null, "error", 42, true])("returns false for %p", (value) => {
        expect(isEventNestException(value)).toBe(false);
    });

    describe("with an error code", () => {
        test("returns true when the error code matches", () => {
            const exception = new EventConcurrencyException("aggregate-123", 4, 5);

            expect(isEventNestException(exception, CoreErrorCodes.EVENT_CONCURRENCY_ISSUE)).toBe(true);
            expect(isEventNestException(exception, "en_1002")).toBe(true);
        });

        test("returns false when the error code does not match", () => {
            const exception = new EventConcurrencyException("aggregate-123", 4, 5);

            expect(isEventNestException(exception, CoreErrorCodes.SNAPSHOT_REVISION_MISMATCH)).toBe(false);
        });

        test("matches an error branded by another copy of the package by its code", () => {
            const foreignError = Object.assign(new Error("foreign"), {
                errorCode: "en_1002",
                [Symbol.for("@event-nest/error")]: true
            });

            expect(isEventNestException(foreignError, CoreErrorCodes.EVENT_CONCURRENCY_ISSUE)).toBe(true);
            expect(isEventNestException(foreignError, CoreErrorCodes.UNKNOWN_EVENT)).toBe(false);
        });

        test("returns false for a non event nest error even if the code matches", () => {
            expect(isEventNestException(Object.assign(new Error("test"), { errorCode: "en_1002" }), "en_1002")).toBe(
                false
            );
        });
    });

    describe("with an exception class", () => {
        test("returns true and narrows the type when the static code matches", () => {
            const error: unknown = new EventConcurrencyException("aggregate-123", 4, 5);

            if (!isEventNestException(error, EventConcurrencyException)) {
                throw new Error("expected a match");
            }

            expect(error.aggregateRootId).toBe("aggregate-123");
            expect(error.storedVersion).toBe(4);
            expect(error.expectedVersion).toBe(5);
        });

        test("returns false for a different exception class", () => {
            const exception = new EventConcurrencyException("aggregate-123", 4, 5);

            expect(isEventNestException(exception, SnapshotRevisionMismatchException)).toBe(false);
        });

        test("matches an error branded by another copy of the package by the class code", () => {
            const foreignError = Object.assign(new Error("foreign"), {
                errorCode: EventConcurrencyException.code,
                [Symbol.for("@event-nest/error")]: true
            });

            expect(foreignError).not.toBeInstanceOf(EventConcurrencyException);
            expect(isEventNestException(foreignError, EventConcurrencyException)).toBe(true);
        });
    });
});
