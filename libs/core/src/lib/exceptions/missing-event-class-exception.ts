import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";

/**
 * Thrown during the initialization of the application at the point where the @ApplyEvent decorators are processed if the
 * provided event class is null or undefined.
 */
export class MissingEventClassException extends EventNestException {
    constructor() {
        super(
            MissingEventClassException.name,
            CoreErrorCodes.MISSING_EVENT_CLASS,
            `@ApplyEvent decorator was used with a null or undefined event class. This may be a problem with your imports.`
        );
    }
}
