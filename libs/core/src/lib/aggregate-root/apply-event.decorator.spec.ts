import { MissingEventClassException } from "../exceptions/missing-event-class-exception";
import { AggregateRoot } from "./aggregate-root";
import { ApplyEvent } from "./apply-event.decorator";
import { getDecoratedPropertyKey } from "./reflection";

class Event1 {}

class Event2 {}

class TestEntity extends AggregateRoot {
    constructor() {
        super("id");
    }

    @ApplyEvent(Event1)
    processTestEvent() {
        // do something
    }
}

class UndecoratedEntity extends AggregateRoot {
    constructor() {
        super("id");
    }
}

describe("ApplyEvent", () => {
    test("adds metadata", () => {
        const metadata = Reflect.getMetadata("event-nest-process-event-meta-processTestEvent", new TestEntity());
        expect(metadata).toBeDefined();
        expect(metadata.eventClass).toBe(Event1);
        expect(metadata.key).toBe("processTestEvent");
    });

    test("throws exception if event class is undefined", () => {
        expect(() => {
            ApplyEvent(undefined as any)(new TestEntity(), "processTestEvent");
        }).toThrow(MissingEventClassException);
    });
});

describe("getDecoratedPropertyKey tests", () => {
    test("returns undefined if no metadata", () => {
        const key = getDecoratedPropertyKey(new UndecoratedEntity(), Event1);
        expect(key).toBeUndefined();
    });

    test("returns undefined if event class is not matched", () => {
        const key = getDecoratedPropertyKey(new TestEntity(), Event2);
        expect(key).toBeUndefined();
    });

    test("returns key if event class is matched", () => {
        const key = getDecoratedPropertyKey(new TestEntity(), Event1);
        expect(key).toBe("processTestEvent");
    });
});
