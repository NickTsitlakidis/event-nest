import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Exception thrown when an aggregate root is missing the @AggregateRootName decorator
 */
export class MissingAggregateRootNameException extends EventNestException {
    constructor(aggregateRootClassName: string) {
        super(
            MissingAggregateRootNameException.name,
            CoreErrorCodes.MISSING_AGGREGATE_ROOT_NAME,
            `${aggregateRootClassName} is not decorated with @AggregateRootName. Use the decorator to set the name of the aggregate root`
        );
    }
}
