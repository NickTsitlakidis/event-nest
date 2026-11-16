import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";
import { UnregisteredEventException } from "./unregistered-event-exception";

describe("UnregisteredEventException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new UnregisteredEventException("OrderPlaced");

        expect(exception).toBeInstanceOf(UnregisteredEventException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.name).toBe("UnregisteredEventException");
        expect(exception.errorCode).toBe(CoreErrorCodes.UNREGISTERED_EVENT);
        expect(exception.errorCode).toBe(UnregisteredEventException.code);
        expect(exception.message).toBe(
            "OrderPlaced is not registered to be processed. Use the @DomainEvent decorator to register it."
        );
    });
});
