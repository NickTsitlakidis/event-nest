import "reflect-metadata";

import { AggregateInstanceNotSnapshotAwareException } from "../exceptions/aggregate-instance-not-snapshot-aware-exception";
import { AggregateRoot } from "./aggregate-root";
import { AggregateRootConfig } from "./aggregate-root-config";
import {
    assertIsSnapshotAwareAggregateRoot,
    isAggregateClassSnapshotAware,
    isAggregateInstanceSnapshotAware,
    SnapshotAware
} from "./snapshot-aware";

class InvalidSnapshotAwareNonFunctionApplySnapshot extends AggregateRoot {
    applySnapshot = "not a function";

    constructor(id: string) {
        super(id);
    }
    toSnapshot(): unknown {
        return {};
    }
}

class InvalidSnapshotAwareNonFunctionToSnapshot extends AggregateRoot {
    toSnapshot = "not a function";

    constructor(id: string) {
        super(id);
    }
    applySnapshot(snapshot: unknown): void {
        void snapshot;
    }
}

@AggregateRootConfig({ name: "NonSnapshotAggregate" })
class NonSnapshotClassAggregate extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

@AggregateRootConfig({ name: "PartialSnapshotAwareMissingToSnapshot", snapshotRevision: 1 })
class PartialSnapshotAwareMissingToSnapshot extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }

    applySnapshot(snapshot: unknown): void {
        void snapshot;
    }
}

@AggregateRootConfig({ name: "SnapshotAwareAggregate", snapshotRevision: 1 })
class SnapshotAwareAggregate extends AggregateRoot implements SnapshotAware<{ version: number }> {
    constructor(id: string) {
        super(id);
    }

    applySnapshot(snapshot: { version: number }): void {
        void snapshot;
    }

    toSnapshot(): { version: number } {
        return { version: this.version };
    }
}

@AggregateRootConfig({ name: "SnapshotAggregate", snapshotRevision: 1 })
class SnapshotClassAggregate extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

describe("snapshot-aware", () => {
    describe("isAggregateInstanceSnapshotAware", () => {
        it("should return true for aggregate instances that implement SnapshotAware", () => {
            const aggregate = new SnapshotAwareAggregate("test-id");

            const result = isAggregateInstanceSnapshotAware(aggregate);

            expect(result).toBe(true);
        });

        it("should return false for aggregates missing toSnapshot method", () => {
            const aggregate = new PartialSnapshotAwareMissingToSnapshot("test-id");

            const result = isAggregateInstanceSnapshotAware(aggregate);

            expect(result).toBe(false);
        });

        it("should return false for aggregates with non-function toSnapshot", () => {
            const aggregate = new InvalidSnapshotAwareNonFunctionToSnapshot("test-id");

            const result = isAggregateInstanceSnapshotAware(aggregate);

            expect(result).toBe(false);
        });

        it("should return false for aggregates with non-function applySnapshot", () => {
            const aggregate = new InvalidSnapshotAwareNonFunctionApplySnapshot("test-id");

            const result = isAggregateInstanceSnapshotAware(aggregate);

            expect(result).toBe(false);
        });
    });

    describe("isAggregateClassSnapshotAware", () => {
        it("should return true for aggregate classes with snapshotRevision configured", () => {
            const aggregate = new SnapshotClassAggregate("test-id");

            const result = isAggregateClassSnapshotAware(aggregate);

            expect(result).toBe(true);
        });

        it("should return false for aggregate classes without snapshotRevision configured", () => {
            const aggregate = new NonSnapshotClassAggregate("test-id");

            const result = isAggregateClassSnapshotAware(aggregate);

            expect(result).toBe(false);
        });
    });

    describe("assertIsSnapshotAwareAggregateRoot", () => {
        it("does nothing for valid snapshot aware aggregate roots", () => {
            const aggregate = new SnapshotAwareAggregate("test-id");

            expect(() => assertIsSnapshotAwareAggregateRoot(aggregate)).not.toThrow();
        });

        it("throws when instance is missing SnapshotAware methods", () => {
            const aggregate = new PartialSnapshotAwareMissingToSnapshot("test-id");

            expect(() => assertIsSnapshotAwareAggregateRoot(aggregate)).toThrow(
                AggregateInstanceNotSnapshotAwareException
            );
        });

        it("throws when aggregate class lacks snapshotRevision metadata", () => {
            const aggregate = new NonSnapshotClassAggregate("test-id");

            expect(() => assertIsSnapshotAwareAggregateRoot(aggregate)).toThrow(
                AggregateInstanceNotSnapshotAwareException
            );
        });
    });
});
