import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventConcurrencyException } from "./event-concurrency-exception";
import { EventNestException } from "./event-nest-exception";

describe("EventConcurrencyException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new EventConcurrencyException("aggregate-123", 4, 5);

        expect(exception).toBeInstanceOf(EventConcurrencyException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.errorName).toBe("EventConcurrencyException");
        expect(exception.errorCode).toBe(CoreErrorCodes.EVENT_CONCURRENCY_ISSUE);
        expect(exception.message).toBe(
            "EventConcurrencyException (1002): Concurrency issue for aggregate aggregate-123. Expected 5. Stored 4"
        );
    });
});
