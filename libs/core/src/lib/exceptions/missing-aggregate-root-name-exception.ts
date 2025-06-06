/**
 * Exception thrown when an aggregate root is missing the @AggregateRootName decorator
 */
export class MissingAggregateRootNameException extends Error {
    constructor(aggregateRootClassName: string) {
        super(
            `${aggregateRootClassName} is not decorated with @AggregateRootName. Use the decorator to set the name of the aggregate root`
        );
    }
}
