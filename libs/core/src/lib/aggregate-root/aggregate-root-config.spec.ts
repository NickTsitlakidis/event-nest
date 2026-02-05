import { expectTypeOf } from "expect-type";
import "reflect-metadata";

import { AggregateRootClass, SnapshotAwareAggregateRoot } from "../storage/event-store";
import { AggregateRootConfig, getAggregateRootName, getAggregateRootSnapshotRevision } from "./aggregate-root-config";

describe("AggregateRootConfig", () => {
    describe("getAggregateRootSnapshotRevision", () => {
        it("should return the snapshotRevision when provided", () => {
            const snapshotRevision = 2;
            @AggregateRootConfig({ name: "TestAggregate", snapshotRevision })
            class TestAggregate {}

            const result = getAggregateRootSnapshotRevision(TestAggregate);
            expect(result).toBe(snapshotRevision);
        });

        it("should return undefined when snapshotRevision is not provided", () => {
            @AggregateRootConfig({ name: "TestAggregate" })
            class TestAggregate {}

            const result = getAggregateRootSnapshotRevision(TestAggregate);
            expect(result).toBeUndefined();
        });

        // Type Tests
        const snapshotRevisionDefault = getAggregateRootSnapshotRevision({} as AggregateRootClass<unknown>);
        const snapshotRevisionWithSnapshotAware = getAggregateRootSnapshotRevision(
            {} as AggregateRootClass<SnapshotAwareAggregateRoot>
        );
        expectTypeOf(snapshotRevisionDefault).toEqualTypeOf<number | undefined>();
        expectTypeOf(snapshotRevisionWithSnapshotAware).toEqualTypeOf<number>();
    });

    describe("getAggregateRootName", () => {
        it("should return the name from config", () => {
            const name = "TestAggregate";
            @AggregateRootConfig({ name, snapshotRevision: 1 })
            class TestAggregate {}

            const result = getAggregateRootName(TestAggregate);
            expect(result).toBe(name);
        });

        // Type tests
        const aggregateNameDefault = getAggregateRootName({} as AggregateRootClass<unknown>);
        const aggregateNameWithSnapshotAware = getAggregateRootName(
            {} as AggregateRootClass<SnapshotAwareAggregateRoot>
        );
        expectTypeOf(aggregateNameDefault).toEqualTypeOf<string | undefined>();
        expectTypeOf(aggregateNameWithSnapshotAware).toEqualTypeOf<string>();
    });
});
