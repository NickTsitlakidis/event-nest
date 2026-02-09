/**
 * Exception thrown whenever AggregateRoot doesn't have snapshotRevision value attached, but it's needed either for snapshot creation or restoration.
 */
export class AggregateClassNotSnapshotAwareException extends Error {
    constructor(aggregateRootName?: string) {
        super(
            `Missing snapshot revision for aggregate root: ${aggregateRootName}\n. Did you forget to add snapshotRevision in AggregateRootConfig?`
        );
    }
}
