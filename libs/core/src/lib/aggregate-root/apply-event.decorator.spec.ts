/* eslint-disable unicorn/no-nonstandard-builtin-properties */
import { MissingEventClassException } from "../exceptions/missing-event-class-exception";
import { AggregateRoot } from "./aggregate-root";
import { ApplyEvent } from "./apply-event.decorator";
import { getDecoratedPropertyKey } from "./reflection";

class Event1 {}

class Event2 {}

class Event3 {}

class StackedEntity extends AggregateRoot {
    constructor() {
        super("id");
    }

    @ApplyEvent(Event1)
    @ApplyEvent(Event2)
    @ApplyEvent(Event2)
    processEither() {
        // do something
    }
}

class OverridingEntity extends StackedEntity {
    @ApplyEvent(Event3)
    override processEither() {
        // do something else
    }
}

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

describe("apply-event.decorator", () => {
    describe("ApplyEvent", () => {
        test("adds metadata", () => {
            const metadata = Reflect.getMetadata("event-nest-process-event-meta-processTestEvent", new TestEntity());
            expect(metadata).toBeDefined();
            expect(metadata.eventClasses).toEqual([Event1]);
            expect(metadata.key).toBe("processTestEvent");
        });

        test("collects the event classes of stacked decorators without duplicates", () => {
            const metadata = Reflect.getMetadata("event-nest-process-event-meta-processEither", new StackedEntity());
            expect(metadata.eventClasses).toHaveLength(2);
            expect(metadata.eventClasses).toEqual(expect.arrayContaining([Event1, Event2]));
            expect(metadata.key).toBe("processEither");
        });

        test("throws exception if event class is undefined", () => {
            expect(() => {
                ApplyEvent(undefined as any)(new TestEntity(), "processTestEvent");
            }).toThrow(MissingEventClassException);
        });
    });

    describe("getDecoratedPropertyKey", () => {
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

        test("returns the same key for every event class of stacked decorators", () => {
            const entity = new StackedEntity();
            expect(getDecoratedPropertyKey(entity, Event1)).toBe("processEither");
            expect(getDecoratedPropertyKey(entity, Event2)).toBe("processEither");
        });

        test("uses only the event classes of the subclass when it overrides a decorated method", () => {
            const entity = new OverridingEntity();
            expect(getDecoratedPropertyKey(entity, Event3)).toBe("processEither");
            expect(getDecoratedPropertyKey(entity, Event1)).toBeUndefined();
            expect(getDecoratedPropertyKey(entity, Event2)).toBeUndefined();
        });

        test("ignores metadata that was not added by ApplyEvent", () => {
            const entity = new TestEntity();
            Reflect.defineMetadata("some-other-library", undefined, entity);
            expect(getDecoratedPropertyKey(entity, Event1)).toBe("processTestEvent");
            expect(getDecoratedPropertyKey(entity, Event2)).toBeUndefined();
        });
    });
});
