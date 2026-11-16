import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventConcurrencyException } from "./event-concurrency-exception";
import { EventNestException } from "./event-nest-exception";

describe("EventConcurrencyException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new EventConcurrencyException("aggregate-123", 4, 5);

        expect(exception).toBeInstanceOf(EventConcurrencyException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.name).toBe("EventConcurrencyException");
        expect(exception.errorCode).toBe(CoreErrorCodes.EVENT_CONCURRENCY_ISSUE);
        expect(exception.message).toBe("Concurrency issue for aggregate aggregate-123. Expected 5. Stored 4");
    });

    test("serializes the public fields to JSON without private keys", () => {
        const exception = new EventConcurrencyException("aggregate-123", 4, 5);

        // The round trip is intentional: the assertion is about what JSON.stringify emits, not about cloning.
        // eslint-disable-next-line unicorn/prefer-structured-clone
        expect(JSON.parse(JSON.stringify(exception))).toEqual({
            aggregateRootId: "aggregate-123",
            errorCode: "en_1002",
            expectedVersion: 5,
            name: "EventConcurrencyException",
            storedVersion: 4
        });
    });
});
