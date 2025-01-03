/**
 * Thrown during event persistence. Each database technology is using its own id format. This exception is thrown
 * when event-nest tries to generate multiple ids and the number of generated ids does not match the expected number.
 */
export class IdGenerationException extends Error {
    constructor(idsLength: number, expectedLength: number) {
        super(`Unexpected mismatch of required ids. Generated: ${idsLength}, expected: ${expectedLength}`);
    }
}
