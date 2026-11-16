export class EventNestException extends Error {
    constructor(
        private _errorName: string,
        private _errorCode: string,
        message: string
    ) {
        super(`${_errorName} (${_errorCode}): ${message}`);
    }

    get errorCode(): string {
        return this._errorCode;
    }

    get errorName(): string {
        return this._errorName;
    }
}
