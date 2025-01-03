/**
 * Thrown during reconstitution of an aggregate root if the event is not registered using the @DomainEvent decorator.
 */
export class UnknownEventException extends Error {
    constructor(unregisteredEventNames: Array<string>, missingApplyEventNames: Array<string>, aggregateRootId: string) {
        super(
            `Found unknown events for aggregate root ${aggregateRootId}. Unregistered : ${unregisteredEventNames.join(
                ", "
            )}. Missing apply method: ${missingApplyEventNames.join(", ")}`
        );
    }
}
