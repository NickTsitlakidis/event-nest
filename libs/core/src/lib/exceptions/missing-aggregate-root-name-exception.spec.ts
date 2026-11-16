import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";
import { MissingAggregateRootNameException } from "./missing-aggregate-root-name-exception";

describe("MissingAggregateRootNameException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new MissingAggregateRootNameException("OrderAggregate");

        expect(exception).toBeInstanceOf(MissingAggregateRootNameException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.errorName).toBe("MissingAggregateRootNameException");
        expect(exception.errorCode).toBe(CoreErrorCodes.MISSING_AGGREGATE_ROOT_NAME);
        expect(exception.message).toBe(
            "MissingAggregateRootNameException (en_1007): OrderAggregate is not decorated with @AggregateRootName. Use the decorator to set the name of the aggregate root"
        );
    });
});
