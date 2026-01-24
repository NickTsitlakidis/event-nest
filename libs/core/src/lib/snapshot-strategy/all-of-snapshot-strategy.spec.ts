import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { AggregateRootName } from "../aggregate-root/aggregate-root-name";
import { DomainEvent } from "../domain-event";
import { AllOfSnapshotStrategy } from "./all-of-snapshot-strategy";
import { ForAggregateRootsStrategy } from "./for-aggregate-roots-strategy";
import { ForCountSnapshotStrategy } from "./for-count-snapshot-strategy";
import { ForEventsSnapshotStrategy } from "./for-events-snapshot-strategy";
import { SnapshotStrategy } from "./snapshot-strategy";

class AlwaysFalseStrategy extends SnapshotStrategy {
    shouldCreateSnapshot(): boolean {
        return false;
    }
}

class AlwaysTrueStrategy extends SnapshotStrategy {
    shouldCreateSnapshot(): boolean {
        return true;
    }
}

@AggregateRootName("TestAggregateRoot")
class TestAggregateRoot extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

@AggregateRootName("TestAggregateRoot2")
class TestAggregateRoot2 extends AggregateRoot {
    static snapshotRevision = 1;

    constructor(id: string) {
        super(id);
    }
}

@DomainEvent("TestEvent1")
class TestEvent1 {}

@DomainEvent("TestEvent2")
class TestEvent2 {}

describe("AllOfSnapshotStrategy", () => {
    describe("constructor", () => {
        test("throws error when strategies array is empty", () => {
            expect(() => new AllOfSnapshotStrategy([])).toThrow("AllOfSnapshotStrategy requires at least one strategy");
        });
    });

    describe("shouldCreateSnapshot=true", () => {
        test("returns true when single strategy returns true", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new AllOfSnapshotStrategy([new AlwaysTrueStrategy()]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });

        test("returns true when multiple strategies return true", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new AllOfSnapshotStrategy([
                new AlwaysTrueStrategy(),
                new AlwaysTrueStrategy(),
                new AlwaysTrueStrategy()
            ]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });

        test("returns true when all real strategies match", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            (aggregateRoot as any)._version = 9;
            const event1 = new TestEvent1();
            aggregateRoot.append(event1);

            const strategy = new AllOfSnapshotStrategy([
                new ForCountSnapshotStrategy({ count: 10 }),
                new ForEventsSnapshotStrategy({ eventClasses: [TestEvent1] })
            ]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });

        test("returns true when multiple count and event strategies all match", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            (aggregateRoot as any)._version = 9;
            const event1 = new TestEvent1();
            aggregateRoot.append(event1);

            const strategy = new AllOfSnapshotStrategy([
                new ForCountSnapshotStrategy({ count: 10 }),
                new ForEventsSnapshotStrategy({ eventClasses: [TestEvent1] }),
                new AlwaysTrueStrategy()
            ]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });
    });

    describe("shouldCreateSnapshot=false", () => {
        test("returns false when single strategy returns false", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new AllOfSnapshotStrategy([new AlwaysFalseStrategy()]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("returns false when at least one strategy returns false", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new AllOfSnapshotStrategy([
                new AlwaysTrueStrategy(),
                new AlwaysFalseStrategy(),
                new AlwaysTrueStrategy()
            ]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("returns false when count strategy does not match", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const event1 = new TestEvent1();
            aggregateRoot.append(event1);

            const strategy = new AllOfSnapshotStrategy([
                new ForCountSnapshotStrategy({ count: 10 }),
                new ForEventsSnapshotStrategy({ eventClasses: [TestEvent1] })
            ]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("returns false when event strategy does not match", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            (aggregateRoot as any)._version = 9;
            const event1 = new TestEvent1();
            aggregateRoot.append(event1);

            const strategy = new AllOfSnapshotStrategy([
                new ForCountSnapshotStrategy({ count: 10 }),
                new ForEventsSnapshotStrategy({ eventClasses: [TestEvent2] })
            ]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("returns false when only some strategies match", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            (aggregateRoot as any)._version = 9;
            const event1 = new TestEvent1();
            aggregateRoot.append(event1);

            const strategy = new AllOfSnapshotStrategy([
                new ForCountSnapshotStrategy({ count: 10 }),
                new ForEventsSnapshotStrategy({ eventClasses: [TestEvent1] }),
                new AlwaysFalseStrategy()
            ]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("returns false when aggregate strategy does not match", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            (aggregateRoot as any)._version = 9;
            const event1 = new TestEvent1();
            aggregateRoot.append(event1);

            const strategy = new AllOfSnapshotStrategy([
                new ForCountSnapshotStrategy({ count: 10 }),
                new ForEventsSnapshotStrategy({ eventClasses: [TestEvent1] }),
                new ForAggregateRootsStrategy({ aggregates: [TestAggregateRoot2] })
            ]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });
    });
});
