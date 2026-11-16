import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNameConflictException } from "./event-name-conflict-exception";
import { EventNestException } from "./event-nest-exception";

describe("EventNameConflictException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new EventNameConflictException("OrderPlaced");

        expect(exception).toBeInstanceOf(EventNameConflictException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.name).toBe("EventNameConflictException");
        expect(exception.errorCode).toBe(CoreErrorCodes.EVENT_NAME_CONFLICT);
        expect(exception.message).toBe("OrderPlaced is already registered as RegisteredEvent. Use another name");
    });
});
