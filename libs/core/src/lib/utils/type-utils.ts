export function hasAllValues<T>(toCheck: Array<null | T | undefined>): toCheck is Array<T> {
    return toCheck.every((item) => !isNil(item));
}

export function isNil(toCheck: unknown): toCheck is null | undefined {
    return toCheck === null || toCheck === undefined;
}
