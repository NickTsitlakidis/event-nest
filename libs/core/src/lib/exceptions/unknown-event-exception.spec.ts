import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";
import { UnknownEventException } from "./unknown-event-exception";

describe("UnknownEventException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new UnknownEventException(["UnregisteredEvent"], ["MissingHandlerEvent"], "aggregate-123");

        expect(exception).toBeInstanceOf(UnknownEventException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.errorName).toBe("UnknownEventException");
        expect(exception.errorCode).toBe(CoreErrorCodes.UNKNOWN_EVENT);
        expect(exception.message).toBe(
            "UnknownEventException (1010): Found unknown events for aggregate root aggregate-123. Unregistered : UnregisteredEvent. Missing apply method: MissingHandlerEvent"
        );
    });

    test("formats empty event-name arrays", () => {
        const exception = new UnknownEventException([], [], "aggregate-123");

        expect(exception.message).toBe(
            "UnknownEventException (1010): Found unknown events for aggregate root aggregate-123. Unregistered : . Missing apply method: "
        );
    });

    test("joins multiple event names with commas", () => {
        const exception = new UnknownEventException(
            ["UnregisteredEvent1", "UnregisteredEvent2"],
            ["MissingHandlerEvent1", "MissingHandlerEvent2"],
            "aggregate-123"
        );

        expect(exception.message).toBe(
            "UnknownEventException (1010): Found unknown events for aggregate root aggregate-123. Unregistered : UnregisteredEvent1, UnregisteredEvent2. Missing apply method: MissingHandlerEvent1, MissingHandlerEvent2"
        );
    });
});
