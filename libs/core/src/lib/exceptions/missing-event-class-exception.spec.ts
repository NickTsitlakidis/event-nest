import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";
import { MissingEventClassException } from "./missing-event-class-exception";

describe("MissingEventClassException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new MissingEventClassException();

        expect(exception).toBeInstanceOf(MissingEventClassException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.name).toBe("MissingEventClassException");
        expect(exception.errorCode).toBe(CoreErrorCodes.MISSING_EVENT_CLASS);
        expect(exception.message).toBe(
            "@ApplyEvent decorator was used with a null or undefined event class. This may be a problem with your imports."
        );
    });
});
