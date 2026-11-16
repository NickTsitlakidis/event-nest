import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Exception thrown whenever Strategy matches to create a snapshot for a specified AggregateRoot, but AggregateRoot doesn't implement the SnapshotAware interface correctly
 */
export class AggregateInstanceNotSnapshotAwareException extends EventNestException {
    constructor(aggregateRootName?: string) {
        super(
            AggregateInstanceNotSnapshotAwareException.name,
            CoreErrorCodes.AGGREGATE_INSTANCE_NOT_SNAPSHOT_AWARE,
            `The snasphot should be created, but ${aggregateRootName} doesn't implement SnapshotAware interface correctly\n. Did you forget to implement .toSnapshot() or .applySnapshot()?`
        );
    }
}
