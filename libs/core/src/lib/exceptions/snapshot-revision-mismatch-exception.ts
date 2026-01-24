/**
 * Exception thrown whenever there's a mismatch between a snapshot record revision and a revision on an aggregate root class.
 */
export class SnapshotRevisionMismatchException extends Error {
    constructor(aggregateRootName: string) {
        super(
            `The snapshotRevision on ${aggregateRootName} doesn't match the latest stored snapshot.
             Please, check that the YourAggregateRootClass.snapshotRevision static property is correclty configured.`
        );
    }
}
