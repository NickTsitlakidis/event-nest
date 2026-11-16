import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";
import { UnknownEventVersionException } from "./unknown-event-version-exception";

describe("UnknownEventVersionException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new UnknownEventVersionException("event-123", "aggregate-123");

        expect(exception).toBeInstanceOf(UnknownEventVersionException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.errorName).toBe("UnknownEventVersionException");
        expect(exception.errorCode).toBe(CoreErrorCodes.UNKNOWN_EVENT_VERSION);
        expect(exception.message).toBe(
            "UnknownEventVersionException (1011): Unable to set version of event event-123 for aggregate root with id aggregate-123"
        );
    });
});
