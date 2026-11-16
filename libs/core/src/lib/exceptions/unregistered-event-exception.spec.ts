import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";
import { UnregisteredEventException } from "./unregistered-event-exception";

describe("UnregisteredEventException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new UnregisteredEventException("OrderPlaced");

        expect(exception).toBeInstanceOf(UnregisteredEventException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.errorName).toBe("UnregisteredEventException");
        expect(exception.errorCode).toBe(CoreErrorCodes.UNREGISTERED_EVENT);
        expect(exception.message).toBe(
            "UnregisteredEventException (en_1012): OrderPlaced is not registered to be processed. Use the @DomainEvent decorator to register it."
        );
    });
});
