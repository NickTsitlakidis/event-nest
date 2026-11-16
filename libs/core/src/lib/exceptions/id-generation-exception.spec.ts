import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";
import { IdGenerationException } from "./id-generation-exception";

describe("IdGenerationException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new IdGenerationException(2, 3);

        expect(exception).toBeInstanceOf(IdGenerationException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.name).toBe("IdGenerationException");
        expect(exception.errorCode).toBe(CoreErrorCodes.ID_GENERATION_FAILURE);
        expect(exception.errorCode).toBe(IdGenerationException.code);
        expect(exception.message).toBe("Unexpected mismatch of required ids. Generated: 2, expected: 3");
    });
});
