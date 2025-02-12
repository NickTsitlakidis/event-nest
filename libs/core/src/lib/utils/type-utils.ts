import { isNil } from "es-toolkit";

export function hasAllValues<T>(toCheck: Array<null | T | undefined>): toCheck is Array<T> {
    return toCheck.every((item) => !isNil(item));
}
