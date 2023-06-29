export function isNil(toCheck: unknown): toCheck is null | undefined {
    return toCheck === null || toCheck === undefined;
}

export function hasAllValues<T>(toCheck: Array<T | null | undefined>): toCheck is Array<T> {
    return toCheck.every((item) => !isNil(item));
}
