import { AggregateInstanceNotSnapshotAwareException } from "./aggregate-instance-not-snapshot-aware-exception";
import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

describe("AggregateInstanceNotSnapshotAwareException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new AggregateInstanceNotSnapshotAwareException("OrderAggregate");

        expect(exception).toBeInstanceOf(AggregateInstanceNotSnapshotAwareException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.name).toBe("AggregateInstanceNotSnapshotAwareException");
        expect(exception.errorCode).toBe(CoreErrorCodes.AGGREGATE_INSTANCE_NOT_SNAPSHOT_AWARE);
        expect(exception.message).toBe(
            "The snapshot should be created, but OrderAggregate doesn't implement SnapshotAware interface correctly\n. Did you forget to implement .toSnapshot() or .applySnapshot()?"
        );
    });

    test("supports an omitted aggregate root name", () => {
        const exception = new AggregateInstanceNotSnapshotAwareException();

        expect(exception.message).toBe(
            "The snapshot should be created, but undefined doesn't implement SnapshotAware interface correctly\n. Did you forget to implement .toSnapshot() or .applySnapshot()?"
        );
    });
});
