import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { AggregateRootName } from "../aggregate-root/aggregate-root-name";
import { DomainEvent } from "../domain-event";
import { ForEventsSnapshotStrategy } from "./for-events-snapshot-strategy";

@AggregateRootName("TestAggregateRoot")
class TestAggregateRoot extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

@DomainEvent("TestEvent1")
class TestEvent1 {}

@DomainEvent("TestEvent2")
class TestEvent2 {}

@DomainEvent("TestEvent3")
class TestEvent3 {}

describe("ForEventsSnapshotStrategy", () => {
    describe("shouldCreateSnapshot=true", () => {
        test("when a matching event is present", () => {
            const event1 = new TestEvent1();
            const aggregateRoot = new TestAggregateRoot("test-id");
            aggregateRoot.append(event1);
            const strategy = new ForEventsSnapshotStrategy({ eventClasses: [TestEvent1] });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });

        test("when any of multiple event classes match", () => {
            const event2 = new TestEvent2();
            const aggregateRoot = new TestAggregateRoot("test-id");
            aggregateRoot.append(event2);

            const strategy = new ForEventsSnapshotStrategy({
                eventClasses: [TestEvent1, TestEvent2, TestEvent3]
            });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });

        test("when multiple events are present and one matches", () => {
            const event1 = new TestEvent1();
            const event2 = new TestEvent2();
            const aggregateRoot = new TestAggregateRoot("test-id");
            aggregateRoot.append(event1);
            aggregateRoot.append(event2);

            const strategy = new ForEventsSnapshotStrategy({ eventClasses: [TestEvent1] });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });

        test("when multiple events are present and multiple match", () => {
            const event1 = new TestEvent1();
            const event2 = new TestEvent2();
            const aggregateRoot = new TestAggregateRoot("test-id");
            aggregateRoot.append(event1);
            aggregateRoot.append(event2);

            const strategy = new ForEventsSnapshotStrategy({
                eventClasses: [TestEvent1, TestEvent2]
            });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });
    });

    describe("shouldCreateSnapshot=false", () => {
        test("when no matching events are present", () => {
            const event1 = new TestEvent1();
            const aggregateRoot = new TestAggregateRoot("test-id");
            aggregateRoot.append(event1);

            const strategy = new ForEventsSnapshotStrategy({ eventClasses: [TestEvent2] });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("when none of multiple event classes match", () => {
            const event1 = new TestEvent1();
            const aggregateRoot = new TestAggregateRoot("test-id");
            aggregateRoot.append(event1);

            const strategy = new ForEventsSnapshotStrategy({
                eventClasses: [TestEvent2, TestEvent3]
            });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("when events array is empty", () => {
            const aggregateRoot = new TestAggregateRoot("test-id");

            const strategy = new ForEventsSnapshotStrategy({ eventClasses: [TestEvent1] });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });
    });
});
