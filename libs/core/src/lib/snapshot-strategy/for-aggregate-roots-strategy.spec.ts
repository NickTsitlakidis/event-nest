import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { AggregateRootName } from "../aggregate-root/aggregate-root-name";
import { SnapshotAware } from "../aggregate-root/snapshot-aware";
import { ForAggregateRootsStrategy } from "./for-aggregate-roots-strategy";

interface TestSnapshot {
    data: string;
    id: string;
}

class AggregateRootWithoutName extends AggregateRoot<TestSnapshot> {
    static snapshotRevision = 1;
    data = "";

    constructor(id: string) {
        super(id);
    }

    override applySnapshot(snapshot: TestSnapshot): void {
        this.data = snapshot.data;
    }

    override toSnapshot(): TestSnapshot {
        return { data: this.data, id: this.id };
    }
}

@AggregateRootName("TestAggregate1")
class TestAggregateRoot1 extends AggregateRoot<TestSnapshot> {
    static snapshotRevision = 1;
    data = "";

    constructor(id: string) {
        super(id);
    }

    override applySnapshot(snapshot: TestSnapshot): void {
        this.data = snapshot.data;
    }

    override toSnapshot(): TestSnapshot {
        return { data: this.data, id: this.id };
    }
}

@AggregateRootName("TestAggregate2")
class TestAggregateRoot2 extends AggregateRoot<TestSnapshot> {
    static snapshotRevision = 1;
    data = "";

    constructor(id: string) {
        super(id);
    }

    override applySnapshot(snapshot: TestSnapshot): void {
        this.data = snapshot.data;
    }

    override toSnapshot(): TestSnapshot {
        return { data: this.data, id: this.id };
    }
}

@AggregateRootName("TestAggregate3")
class TestAggregateRoot3 extends AggregateRoot implements SnapshotAware<TestSnapshot> {
    static snapshotRevision = 1;
    data = "";

    constructor(id: string) {
        super(id);
    }

    override applySnapshot(snapshot: TestSnapshot): void {
        this.data = snapshot.data;
    }

    override toSnapshot(): TestSnapshot {
        return { data: this.data, id: this.id };
    }
}

describe("ForAggregateRootsStrategy", () => {
    const aggregateRoot1 = new TestAggregateRoot1("test-id-1");
    const aggregateRoot2 = new TestAggregateRoot2("test-id-2");
    const aggregateRoot3 = new TestAggregateRoot3("test-id-3");

    describe("constructor", () => {
        test("filters out aggregate roots without @AggregateRootName decorator", () => {
            const strategy = new ForAggregateRootsStrategy({
                aggregates: [TestAggregateRoot1, AggregateRootWithoutName as any]
            });

            const aggregateRootWithoutName = new AggregateRootWithoutName("test-id-2");

            expect(strategy.shouldCreateSnapshot(aggregateRoot1)).toBe(true);
            expect(strategy.shouldCreateSnapshot(aggregateRootWithoutName)).toBe(false);
        });
    });

    describe("shouldCreateSnapshot=true", () => {
        test("returns true for single matching aggregate root", () => {
            const strategy = new ForAggregateRootsStrategy({
                aggregates: [TestAggregateRoot1]
            });

            expect(strategy.shouldCreateSnapshot(aggregateRoot1)).toBe(true);
        });

        test("returns true for any matching aggregate root in list", () => {
            const strategy = new ForAggregateRootsStrategy({
                aggregates: [TestAggregateRoot1, TestAggregateRoot2, TestAggregateRoot3]
            });

            expect(strategy.shouldCreateSnapshot(aggregateRoot1)).toBe(true);
            expect(strategy.shouldCreateSnapshot(aggregateRoot2)).toBe(true);
            expect(strategy.shouldCreateSnapshot(aggregateRoot3)).toBe(true);
        });
    });

    describe("shouldCreateSnapshot=false", () => {
        test("returns false for non-matching aggregate root", () => {
            const strategy = new ForAggregateRootsStrategy({
                aggregates: [TestAggregateRoot1]
            });

            expect(strategy.shouldCreateSnapshot(aggregateRoot2)).toBe(false);
        });

        test("returns false when aggregate root is not in the list", () => {
            const strategy = new ForAggregateRootsStrategy({
                aggregates: [TestAggregateRoot1, TestAggregateRoot2]
            });

            expect(strategy.shouldCreateSnapshot(aggregateRoot3)).toBe(false);
        });

        test("returns false for aggregate root without @AggregateRootName decorator", () => {
            const strategy = new ForAggregateRootsStrategy({
                aggregates: [TestAggregateRoot1]
            });

            const aggregateRoot = new AggregateRootWithoutName("test-id");

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("returns false when aggregates list is empty", () => {
            const strategy = new ForAggregateRootsStrategy({ aggregates: [] });

            expect(strategy.shouldCreateSnapshot(aggregateRoot1)).toBe(false);
        });

        test("returns false when only invalid aggregates were provided", () => {
            const strategy = new ForAggregateRootsStrategy({
                aggregates: [AggregateRootWithoutName as any]
            });

            expect(strategy.shouldCreateSnapshot(aggregateRoot1)).toBe(false);
        });
    });
});
