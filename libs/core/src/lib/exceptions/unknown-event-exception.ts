import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Thrown during reconstitution of an aggregate root if the event is not registered using the @DomainEvent decorator.
 */
export class UnknownEventException extends EventNestException {
    static readonly code = CoreErrorCodes.UNKNOWN_EVENT;

    readonly missingApplyEventNames: ReadonlyArray<string>;
    readonly unregisteredEventNames: ReadonlyArray<string>;

    constructor(
        unregisteredEventNames: Array<string>,
        missingApplyEventNames: Array<string>,
        readonly aggregateRootId: string
    ) {
        super(
            UnknownEventException.name,
            UnknownEventException.code,
            `Found unknown events for aggregate root ${aggregateRootId}. Unregistered : ${unregisteredEventNames.join(
                ", "
            )}. Missing apply method: ${missingApplyEventNames.join(", ")}`
        );
        this.unregisteredEventNames = Object.freeze([...unregisteredEventNames]);
        this.missingApplyEventNames = Object.freeze([...missingApplyEventNames]);
    }
}
