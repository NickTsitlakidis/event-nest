import { AGGREGATE_ROOT_NAME_KEY } from "./metadata-keys";

export const AggregateRootName = (name: string): ClassDecorator => {
    return (target: object) => {
        Reflect.defineMetadata(AGGREGATE_ROOT_NAME_KEY, { aggregateRootName: name }, target);
    };
};

// eslint-disable-next-line @typescript-eslint/ban-types
export function getAggregateRootName(targetClass: Function): string | undefined {
    return Reflect.getMetadata(AGGREGATE_ROOT_NAME_KEY, targetClass)?.aggregateRootName;
}
