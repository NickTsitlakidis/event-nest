/**
 * Exception thrown whenever Strategy matches to create a snapshot for a specified AggregateRoot, but AggregateRoot doesn't implement the SnapshotAware interface correctly
 */
export class AggregateInstanceNotSnapshotAwareException extends Error {
    constructor(aggregateRootName?: string) {
        super(
            `The snasphot should be created, but ${aggregateRootName} doesn't implement SnapshotAware interface correctly\n. Did you forget to implement .toSnapshot() or .applySnapshot()?`
        );
    }
}
