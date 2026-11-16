import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Exception thrown whenever AggregateRoot doesn't have snapshotRevision value attached, but it's needed either for snapshot creation or restoration.
 */
export class AggregateClassNotSnapshotAwareException extends EventNestException {
    static readonly code = CoreErrorCodes.AGGREGATE_CLASS_NOT_SNAPSHOT_AWARE;

    constructor(readonly aggregateRootName?: string) {
        super(
            AggregateClassNotSnapshotAwareException.name,
            AggregateClassNotSnapshotAwareException.code,
            `Missing snapshot revision for aggregate root: ${aggregateRootName}\n. Did you forget to add snapshotRevision in AggregateRootConfig?`
        );
    }
}
