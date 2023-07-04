import { AbstractEventStore } from "./abstract-event-store";
import { StoredEvent } from "./stored-event";
import { AggregateRoot } from "../domain/aggregate-root";
import { StoredAggregateRoot } from "./stored-aggregate-root";

class TestStore extends AbstractEventStore {
    constructor() {
        super();
    }
    savedEvents: Array<StoredEvent> = [];
    savedAggregate: StoredAggregateRoot | undefined;

    findByAggregateRootId(id: string): Promise<Array<StoredEvent>> {
        return Promise.resolve([]);
    }

    generateEntityId(): Promise<string> {
        return Promise.resolve("");
    }

    save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>> {
        this.savedEvents = events;
        this.savedAggregate = aggregate;
        return Promise.resolve([]);
    }
}

class TestEntity extends AggregateRoot {
    constructor() {
        super("id");
    }
}

describe("addPublisher tests", () => {
    test("adds publisher method to the aggregate root", () => {
        const store = new TestStore();
        const entity = store.addPublisher(new TestEntity());
        expect(() => entity.publish([])).not.toThrow();
    });

    test("publisher returns if the events array is empty", async () => {
        const store = new TestStore();
        const entity = store.addPublisher(new TestEntity());
        await entity.publish([]);
        expect(store.savedEvents.length).toBe(0);
        expect(store.savedAggregate).toBeUndefined();
    });
});
