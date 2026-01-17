import { isNil } from "es-toolkit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Class<T, Arguments extends unknown[] = any[]> = {
    prototype: Pick<T, keyof T>;
    new (...arguments_: Arguments): T;
};

export function hasAllValues<T>(toCheck: Array<null | T | undefined>): toCheck is Array<T> {
    return toCheck.every((item) => !isNil(item));
}
