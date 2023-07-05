export class UnknownEventException extends Error {
    constructor(
        unregisteredEventNames: Array<string>,
        missingProcessorEventNames: Array<string>,
        aggregateRootId: string
    ) {
        super(
            `Found unknown events for aggregate root ${aggregateRootId}. Unregistered : ${unregisteredEventNames.join(
                ", "
            )}. Missing processor: ${missingProcessorEventNames.join(", ")}`
        );
    }
}
