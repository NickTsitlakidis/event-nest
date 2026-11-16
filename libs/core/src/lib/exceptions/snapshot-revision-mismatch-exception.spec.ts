import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";
import { SnapshotRevisionMismatchException } from "./snapshot-revision-mismatch-exception";

describe("SnapshotRevisionMismatchException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new SnapshotRevisionMismatchException("OrderAggregate");

        expect(exception).toBeInstanceOf(SnapshotRevisionMismatchException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.errorName).toBe("SnapshotRevisionMismatchException");
        expect(exception.errorCode).toBe(CoreErrorCodes.SNAPSHOT_REVISION_MISMATCH);
        expect(exception.message).toBe(
            "SnapshotRevisionMismatchException (1001): The snapshotRevision on OrderAggregate doesn't match the latest stored snapshot.\n             Please, check that the snapshotRevision defined in AggregateRootConfig is correclty configured."
        );
    });
});
