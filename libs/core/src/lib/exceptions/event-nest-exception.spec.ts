import { EventNestException } from "./event-nest-exception";

describe("EventNestException", () => {
    test("formats the message and exposes the error name and code", () => {
        const exception = new EventNestException("TestException", "1234", "test message");

        expect(exception.message).toBe("TestException (1234): test message");
        expect(exception.errorName).toBe("TestException");
        expect(exception.errorCode).toBe("1234");
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
    });
});
