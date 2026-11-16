import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";
import { IdGenerationException } from "./id-generation-exception";

describe("IdGenerationException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new IdGenerationException(2, 3);

        expect(exception).toBeInstanceOf(IdGenerationException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.errorName).toBe("IdGenerationException");
        expect(exception.errorCode).toBe(CoreErrorCodes.ID_GENERATION_FAILURE);
        expect(exception.message).toBe(
            "IdGenerationException (en_1006): Unexpected mismatch of required ids. Generated: 2, expected: 3"
        );
    });
});
