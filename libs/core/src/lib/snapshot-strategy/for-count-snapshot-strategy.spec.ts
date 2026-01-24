import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { AggregateRootName } from "../aggregate-root/aggregate-root-name";
import { DomainEvent } from "../domain-event";
import { ForCountSnapshotStrategy } from "./for-count-snapshot-strategy";

@AggregateRootName("TestAggregateRoot")
class TestAggregateRoot extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

@DomainEvent("TestEvent")
class TestEvent {}

describe("ForCountSnapshotStrategy", () => {
    describe("constructor", () => {
        test("throws error when count is less than 1", () => {
            expect(() => new ForCountSnapshotStrategy({ count: 0 })).toThrow();
            expect(() => new ForCountSnapshotStrategy({ count: -1 })).toThrow();
        });
    });

    describe("shouldCreateSnapshot=true", () => {
        test("returns true when one event reach threshold", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            (aggregateRoot as any)._version = 9;
            const event1 = new TestEvent();
            aggregateRoot.append(event1);

            const strategy = new ForCountSnapshotStrategy({ count: 10 });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });

        test("returns true when multiple hevents reach exact treshold", () => {
            const count = 5;
            const aggregateRoot = new TestAggregateRoot("test-id");
            (aggregateRoot as any)._version = count;

            Array.from({ length: count }).forEach(() => {
                const event1 = new TestEvent();

                aggregateRoot.append(event1);
            });

            const strategy = new ForCountSnapshotStrategy({ count });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });

        test("returns true when crossing threshold with multiple events", () => {
            const count = 5;
            const aggregateRoot = new TestAggregateRoot("test-id");
            (aggregateRoot as any)._version = count;

            Array.from({ length: count * 2 }).forEach(() => {
                const event1 = new TestEvent();

                aggregateRoot.append(event1);
            });

            const strategy = new ForCountSnapshotStrategy({ count });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });
    });

    describe("shouldCreateSnapshot=false", () => {
        test("returns false when no uncommitted events", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new ForCountSnapshotStrategy({ count: 1 });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("returns false when count threshold is not reached", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const event1 = new TestEvent();
            aggregateRoot.append(event1);

            const strategy = new ForCountSnapshotStrategy({ count: 2 });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("returns false when not crossing threshold with existing version", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            (aggregateRoot as any)._version = 8;
            const event1 = new TestEvent();
            aggregateRoot.append(event1);

            const strategy = new ForCountSnapshotStrategy({ count: 10 });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("returns false when exactly at threshold without crossing", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            (aggregateRoot as any)._version = 10;
            const event1 = new TestEvent();
            aggregateRoot.append(event1);

            const strategy = new ForCountSnapshotStrategy({ count: 10 });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });
    });
});
