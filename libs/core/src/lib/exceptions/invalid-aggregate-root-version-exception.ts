import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Thrown when an aggregate root is reconstituted with an invalid authoritative version.
 */
export class InvalidAggregateRootVersionException extends EventNestException {
    static readonly code = CoreErrorCodes.INVALID_AGGREGATE_ROOT_VERSION;

    constructor(readonly aggregateRootVersion: number) {
        super(
            InvalidAggregateRootVersionException.name,
            InvalidAggregateRootVersionException.code,
            `Invalid aggregateRootVersion: ${aggregateRootVersion}. It must be a non-negative integer.`
        );
    }
}
