import { AggregateClassNotSnapshotAwareException } from "./aggregate-class-not-snapshot-aware-exception";
import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

describe("AggregateClassNotSnapshotAwareException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new AggregateClassNotSnapshotAwareException("OrderAggregate");

        expect(exception).toBeInstanceOf(AggregateClassNotSnapshotAwareException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.errorName).toBe("AggregateClassNotSnapshotAwareException");
        expect(exception.errorCode).toBe(CoreErrorCodes.AGGREGATE_CLASS_NOT_SNAPSHOT_AWARE);
        expect(exception.message).toBe(
            "AggregateClassNotSnapshotAwareException (1003): Missing snapshot revision for aggregate root: OrderAggregate\n. Did you forget to add snapshotRevision in AggregateRootConfig?"
        );
    });

    test("supports an omitted aggregate root name", () => {
        const exception = new AggregateClassNotSnapshotAwareException();

        expect(exception.message).toBe(
            "AggregateClassNotSnapshotAwareException (1003): Missing snapshot revision for aggregate root: undefined\n. Did you forget to add snapshotRevision in AggregateRootConfig?"
        );
    });
});
