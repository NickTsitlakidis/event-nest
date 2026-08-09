import { createMock } from "@golevelup/ts-jest";

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

@AggregateRootName("TestAggregateRoot")
class TestAggregateRoot extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

@AggregateRootName("TestAggregateRoot2")
class TestAggregateRoot2 extends AggregateRoot {
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

    describe("shouldCreateSnapshot", () => {
        describe("when it returns true", () => {
            test("returns true when single strategy returns true", async () => {
                const aggregateRoot = new TestAggregateRoot("test-id");
                const strategy = new AllOfSnapshotStrategy([new AlwaysTrueStrategy()]);

                await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(true);
            });

            test("returns true when multiple strategies return true", async () => {
                const aggregateRoot = new TestAggregateRoot("test-id");
                const strategy = new AllOfSnapshotStrategy([
                    new AlwaysTrueStrategy(),
                    new AlwaysTrueStrategy(),
                    new AlwaysTrueStrategy()
                ]);

                await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(true);
            });

            test("returns true when synchronous and asynchronous strategies all match", async () => {
                const aggregateRoot = new TestAggregateRoot("test-id");
                const strategy = new AllOfSnapshotStrategy([new AlwaysTrueStrategy(), new AsyncTrueStrategy()]);

                await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(true);
            });

            test("returns true when all real strategies match", async () => {
                const aggregateRoot = createMock<AggregateRoot>({
                    uncommittedEvents: [
                        {
                            payload: new TestEvent1()
                        }
                    ],
                    version: 9
                });

                const strategy = new AllOfSnapshotStrategy([
                    new ForCountSnapshotStrategy({ count: 10 }),
                    new ForEventsSnapshotStrategy({ eventClasses: [TestEvent1] })
                ]);

                await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(true);
            });

            test("returns true when multiple count and event strategies all match", async () => {
                const aggregateRoot = createMock<AggregateRoot>({
                    uncommittedEvents: [
                        {
                            payload: new TestEvent1()
                        }
                    ],
                    version: 9
                });

                const strategy = new AllOfSnapshotStrategy([
                    new ForCountSnapshotStrategy({ count: 10 }),
                    new ForEventsSnapshotStrategy({ eventClasses: [TestEvent1] }),
                    new AlwaysTrueStrategy()
                ]);

                await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(true);
            });
        });
    });

    describe("when it returns false", () => {
        test("returns false when single strategy returns false", async () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new AllOfSnapshotStrategy([new AlwaysFalseStrategy()]);

            await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(false);
        });

        test("returns false when at least one strategy returns false", async () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new AllOfSnapshotStrategy([
                new AlwaysTrueStrategy(),
                new AlwaysFalseStrategy(),
                new AlwaysTrueStrategy()
            ]);

            await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(false);
        });

        test("returns false when an asynchronous strategy resolves to false", async () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const strategy = new AllOfSnapshotStrategy([new AlwaysTrueStrategy(), new AsyncFalseStrategy()]);

            await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(false);
        });

        test("returns false when count strategy does not match", async () => {
            const aggregateRoot = new TestAggregateRoot("test-id");
            const event1 = new TestEvent1();
            aggregateRoot.append(event1);

            const strategy = new AllOfSnapshotStrategy([
                new ForCountSnapshotStrategy({ count: 10 }),
                new ForEventsSnapshotStrategy({ eventClasses: [TestEvent1] })
            ]);

            await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(false);
        });

        test("returns false when event strategy does not match", async () => {
            const aggregateRoot = createMock<AggregateRoot>({
                uncommittedEvents: [
                    {
                        payload: new TestEvent1()
                    }
                ],
                version: 9
            });

            const strategy = new AllOfSnapshotStrategy([
                new ForCountSnapshotStrategy({ count: 10 }),
                new ForEventsSnapshotStrategy({ eventClasses: [TestEvent2] })
            ]);

            await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(false);
        });

        test("returns false when only some strategies match", async () => {
            const aggregateRoot = createMock<AggregateRoot>({
                uncommittedEvents: [
                    {
                        payload: new TestEvent1()
                    }
                ],
                version: 9
            });

            const strategy = new AllOfSnapshotStrategy([
                new ForCountSnapshotStrategy({ count: 10 }),
                new ForEventsSnapshotStrategy({ eventClasses: [TestEvent1] }),
                new AlwaysFalseStrategy()
            ]);

            await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(false);
        });

        test("returns false when aggregate strategy does not match", async () => {
            const aggregateRoot = createMock<AggregateRoot>({
                uncommittedEvents: [
                    {
                        payload: new TestEvent1()
                    }
                ],
                version: 9
            });

            const strategy = new AllOfSnapshotStrategy([
                new ForCountSnapshotStrategy({ count: 10 }),
                new ForEventsSnapshotStrategy({ eventClasses: [TestEvent1] }),
                new ForAggregateRootsStrategy({ aggregates: [TestAggregateRoot2] })
            ]);

            await expect(strategy.shouldCreateSnapshot(aggregateRoot)).resolves.toBe(false);
        });
    });
});
