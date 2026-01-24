/**
 * Exception thrown whenever no snapshot record is found in the result of calling `.findLatestSnapshotByAggregateId()`.
 */
export class NoSnapshotFoundException extends Error {
    constructor(aggregateRootName: string) {
        super(
            `No snapshot found for ${aggregateRootName}. Please check if the snapshot strategy is configured correctly.`
        );
    }
}
