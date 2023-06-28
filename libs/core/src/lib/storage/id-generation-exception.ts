export class IdGenerationException extends Error {
    constructor(idsLength: number, expectedLength: number) {
        super(`Unexpected mismatch of required ids. Generated: ${idsLength}, expected: ${expectedLength}`);
    }
}
