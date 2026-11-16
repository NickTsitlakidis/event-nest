import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Exception thrown when an aggregate root is missing the @AggregateRootName decorator
 */
export class MissingAggregateRootNameException extends EventNestException {
    static readonly code = CoreErrorCodes.MISSING_AGGREGATE_ROOT_NAME;

    constructor(readonly aggregateRootClassName: string) {
        super(
            MissingAggregateRootNameException.name,
            MissingAggregateRootNameException.code,
            `${aggregateRootClassName} is not decorated with @AggregateRootConfig. Use the decorator to set the name of the aggregate root`
        );
    }
}
