import { createMock } from "@golevelup/ts-jest";

import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { AggregateRootConfig } from "../aggregate-root/aggregate-root-config";
import { DomainEvent } from "../domain-event";
import { AnyOfSnapshotStrategy } from "./any-of-snapshot-strategy";
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

@AggregateRootConfig({ name: "TestAggregateRoot" })
class TestAggregateRoot extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

@DomainEvent("TestEvent1")
class TestEvent1 {}

@DomainEvent("TestEvent2")
class TestEvent2 {}

describe("AnyOfSnapshotStrategy", () => {
    describe("constructor", () => {
        test("throws error when strategies array is empty", () => {
            expect(() => new AnyOfSnapshotStrategy([])).toThrow("AnyOfSnapshotStrategy requires at least one strategy");
        });

        test("does not throw when at least one strategy is provided", () => {
            expect(() => new AnyOfSnapshotStrategy([new AlwaysTrueStrategy()])).not.toThrow();
        });
    });

    describe("shouldCreateSnapshot=true", () => {
        test("returns true when single strategy match", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new AnyOfSnapshotStrategy([new AlwaysTrueStrategy()]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });

        test("returns true when all strategies match", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new AnyOfSnapshotStrategy([
                new AlwaysTrueStrategy(),
                new AlwaysTrueStrategy(),
                new AlwaysTrueStrategy()
            ]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });

        test("returns true when at least one strategy matches", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new AnyOfSnapshotStrategy([
                new AlwaysFalseStrategy(),
                new AlwaysTrueStrategy(),
                new AlwaysFalseStrategy()
            ]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });

        test("returns true when count strategy matches", () => {
            const aggregateRoot = createMock<AggregateRoot>({
                uncommittedEvents: [
                    {
                        payload: new TestEvent1()
                    }
                ],
                version: 9
            });

            const strategy = new AnyOfSnapshotStrategy([
                new ForCountSnapshotStrategy({ count: 10 }),
                new ForEventsSnapshotStrategy({ eventClasses: [TestEvent2] })
            ]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });

        test("returns true when event strategy matches", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const event1 = new TestEvent1();
            aggregateRoot.append(event1);

            const strategy = new AnyOfSnapshotStrategy([
                new ForCountSnapshotStrategy({ count: 10 }),
                new ForEventsSnapshotStrategy({ eventClasses: [TestEvent1] })
            ]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });
    });

    describe("shouldCreateSnapshot=false", () => {
        test("returns false when single strategy returns false", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new AnyOfSnapshotStrategy([new AlwaysFalseStrategy()]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("returns false when all strategies return false", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new AnyOfSnapshotStrategy([
                new AlwaysFalseStrategy(),
                new AlwaysFalseStrategy(),
                new AlwaysFalseStrategy()
            ]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("returns false when no strategies match", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const event1 = new TestEvent1();
            aggregateRoot.append(event1);

            const strategy = new AnyOfSnapshotStrategy([
                new ForCountSnapshotStrategy({ count: 10 }),
                new ForEventsSnapshotStrategy({ eventClasses: [TestEvent2] })
            ]);

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });
    });
});
