import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";
import { InvalidAggregateRootVersionException } from "./invalid-aggregate-root-version-exception";

describe("InvalidAggregateRootVersionException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new InvalidAggregateRootVersionException(-1);

        expect(exception).toBeInstanceOf(InvalidAggregateRootVersionException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.errorName).toBe("InvalidAggregateRootVersionException");
        expect(exception.errorCode).toBe(CoreErrorCodes.INVALID_AGGREGATE_ROOT_VERSION);
        expect(exception.message).toBe(
            "InvalidAggregateRootVersionException (1013): Invalid aggregateRootVersion: -1. It must be a non-negative integer."
        );
    });
});
