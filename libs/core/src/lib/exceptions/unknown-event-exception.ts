export class UnknownEventException extends Error {
    constructor(unregisteredEventNames: Array<string>, missingApplyEventNames: Array<string>, aggregateRootId: string) {
        super(
            `Found unknown events for aggregate root ${aggregateRootId}. Unregistered : ${unregisteredEventNames.join(
                ", "
            )}. Missing apply method: ${missingApplyEventNames.join(", ")}`
        );
    }
}
