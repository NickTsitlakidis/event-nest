import { EventProcessor, getDecoratedPropertyKey } from "./event-processor";
import { AggregateRoot } from "../domain/aggregate-root";

class TestEvent {}

class TestEvent2 {}

class UndecoratedEntity extends AggregateRoot {
    constructor() {
        super("id");
    }
}

class TestEntity extends AggregateRoot {
    constructor() {
        super("id");
    }

    @EventProcessor(TestEvent)
    processTestEvent(event: TestEvent) {
        // do something
    }
}

test("EventProcessor - adds metadata", () => {
    const metadata = Reflect.getMetadata("process-event-meta-processTestEvent", new TestEntity());
    expect(metadata).toBeDefined();
    expect(metadata.eventClass).toBe(TestEvent);
    expect(metadata.key).toBe("processTestEvent");
});

describe("getDecoratedPropertyKey tests", () => {
    test("returns undefined if no metadata", () => {
        const key = getDecoratedPropertyKey(new UndecoratedEntity(), TestEvent);
        expect(key).toBeUndefined();
    });

    test("returns undefined if event class is not matched", () => {
        const key = getDecoratedPropertyKey(new TestEntity(), TestEvent2);
        expect(key).toBeUndefined();
    });

    test("returns key if event class is matched", () => {
        const key = getDecoratedPropertyKey(new TestEntity(), TestEvent);
        expect(key).toBe("processTestEvent");
    });
});
