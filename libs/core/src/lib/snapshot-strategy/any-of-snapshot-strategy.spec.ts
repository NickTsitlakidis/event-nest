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

class AsyncFalseStrategy extends SnapshotStrategy {
    shouldCreateSnapshot(): Promise<boolean> {
        return Promise.resolve(false);
    }
}

class AsyncTrueStrategy extends SnapshotStrategy {
    shouldCreateSnapshot(): Promise<boolean> {
        return Promise.resolve(true);
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

    describe("shouldCreateSnapshot", () => {
        describe("when it returns true", () => {
            test("returns true when single strategy match", async () => {
                const aggregateRoot = new TestAggregateRoot("test-id");
                const strategy = new AnyOfSnapshotStrategy([new AlwaysTrueStrategy()]);

                await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(true);
            });

            test("returns true when all strategies match", async () => {
                const aggregateRoot = new TestAggregateRoot("test-id");
                const strategy = new AnyOfSnapshotStrategy([
                    new AlwaysTrueStrategy(),
                    new AlwaysTrueStrategy(),
                    new AlwaysTrueStrategy()
                ]);

                await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(true);
            });

            test("returns true when at least one strategy matches", async () => {
                const aggregateRoot = new TestAggregateRoot("test-id");
                const strategy = new AnyOfSnapshotStrategy([
                    new AlwaysFalseStrategy(),
                    new AlwaysTrueStrategy(),
                    new AlwaysFalseStrategy()
                ]);

                await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(true);
            });

            test("returns true when only an asynchronous strategy matches", async () => {
                const aggregateRoot = new TestAggregateRoot("test-id");
                const strategy = new AnyOfSnapshotStrategy([new AlwaysFalseStrategy(), new AsyncTrueStrategy()]);

                await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(true);
            });

            test("returns true when count strategy matches", async () => {
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

                await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(true);
            });

            test("returns true when event strategy matches", async () => {
                const aggregateRoot = new TestAggregateRoot("test-id");
                const event1 = new TestEvent1();
                aggregateRoot.append(event1);

                const strategy = new AnyOfSnapshotStrategy([
                    new ForCountSnapshotStrategy({ count: 10 }),
                    new ForEventsSnapshotStrategy({ eventClasses: [TestEvent1] })
                ]);

                await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(true);
            });
        });
    });

    describe("when it returns false", () => {
        test("returns false when single strategy returns false", async () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new AnyOfSnapshotStrategy([new AlwaysFalseStrategy()]);

            await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(false);
        });

        test("returns false when all strategies return false", async () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new AnyOfSnapshotStrategy([
                new AlwaysFalseStrategy(),
                new AlwaysFalseStrategy(),
                new AlwaysFalseStrategy()
            ]);

            await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(false);
        });

        test("returns false when all strategies are asynchronous and resolve to false", async () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new AnyOfSnapshotStrategy([new AsyncFalseStrategy(), new AsyncFalseStrategy()]);

            await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(false);
        });

        test("returns false when no strategies match", async () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const event1 = new TestEvent1();
            aggregateRoot.append(event1);

            const strategy = new AnyOfSnapshotStrategy([
                new ForCountSnapshotStrategy({ count: 10 }),
                new ForEventsSnapshotStrategy({ eventClasses: [TestEvent2] })
            ]);

            await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(false);
        });
    });
});
