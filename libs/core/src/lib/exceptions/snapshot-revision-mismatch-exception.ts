import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Exception thrown whenever there's a mismatch between a snapshot record revision and a revision on an aggregate root class.
 */
export class SnapshotRevisionMismatchException extends EventNestException {
    constructor(aggregateRootName: string) {
        super(
            SnapshotRevisionMismatchException.name,
            CoreErrorCodes.SNAPSHOT_REVISION_MISMATCH,
            `The snapshotRevision on ${aggregateRootName} doesn't match the latest stored snapshot.
             Please, check that the snapshotRevision defined in AggregateRootConfig is correclty configured.`
        );
    }
}
