import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Thrown when an aggregate root is reconstituted with an invalid authoritative version.
 */
export class InvalidAggregateRootVersionException extends EventNestException {
    constructor(readonly aggregateRootVersion: number) {
        super(
            InvalidAggregateRootVersionException.name,
            CoreErrorCodes.INVALID_AGGREGATE_ROOT_VERSION,
            `Invalid aggregateRootVersion: ${aggregateRootVersion}. It must be a non-negative integer.`
        );
    }
}
