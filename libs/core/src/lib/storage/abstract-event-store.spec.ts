import { AbstractEventStore } from "./abstract-event-store";
import { StoredEvent } from "./stored-event";
import { AggregateRoot } from "../aggregate-root";
import { StoredAggregateRoot } from "./stored-aggregate-root";
import { IdGenerationException } from "../exceptions/id-generation-exception";
import { DomainEventEmitter } from "../domain-event-emitter";
import { createMock } from "@golevelup/ts-jest";
import { AggregateRootName } from "../aggregate-root-name";
import { MissingAggregateRootNameException } from "../exceptions/missing-aggregate-root-name-exception";

const eventBusMock = createMock<DomainEventEmitter>();

class TestStore extends AbstractEventStore {
    constructor() {
        super(eventBusMock);
    }
    savedEvents: Array<StoredEvent> = [];
    savedAggregate: StoredAggregateRoot | undefined;

    findByAggregateRootId<T>(): Promise<Array<StoredEvent>> {
        return Promise.resolve([]);
    }

    generateEntityId(): Promise<string> {
        return Promise.resolve("generated-id");
    }

    save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>> {
        this.savedEvents = events;
        this.savedAggregate = aggregate;
        return Promise.resolve([]);
    }
}

@AggregateRootName("test-entity")
class TestEntity extends AggregateRoot {
    constructor() {
        super("id");
    }
}

class NoNameEntity extends AggregateRoot {
    constructor() {
        super("id");
    }
}

class TestEvent {
    constructor(public someProperty: string) {}
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

    test("publisher calls save with events and aggregate", async () => {
        const store = new TestStore();
        const entity = store.addPublisher(new TestEntity());
        const toPublish = [{ aggregateRootId: "id", payload: new TestEvent("test") }];
        await entity.publish(toPublish);
        eventBusMock.emitMultiple.mockResolvedValue("whatever");
        expect(store.savedEvents).toEqual([
            StoredEvent.fromPublishedEvent("generated-id", "id", "test-entity", new TestEvent("test"))
        ]);
        expect(store.savedAggregate?.id).toBe("id");
        expect(store.savedAggregate?.version).toBe(entity.version);
        expect(eventBusMock.emitMultiple).toHaveBeenCalledWith(toPublish);
        expect(eventBusMock.emitMultiple).toHaveBeenCalledTimes(1);
    });

    test("publisher throws when id generation throws", async () => {
        const store = new TestStore();
        const idSpy = jest
            .spyOn(store, "generateEntityId")
            .mockResolvedValueOnce("generated-id")
            .mockRejectedValue(new Error("ooops"));
        const entity = store.addPublisher(new TestEntity());
        await expect(
            entity.publish([
                { aggregateRootId: "id", payload: new TestEvent("test") },
                { aggregateRootId: "id", payload: new TestEvent("test") }
            ])
        ).rejects.toThrow(Error);

        expect(idSpy).toHaveBeenCalledTimes(2);
    });

    test("publisher throws when ids array includes undefined", async () => {
        const store = new TestStore();
        const idSpy = jest
            .spyOn(store, "generateEntityId")
            .mockResolvedValueOnce("generated-id")
            .mockResolvedValueOnce(undefined as any);
        const entity = store.addPublisher(new TestEntity());
        await expect(
            entity.publish([
                { aggregateRootId: "id", payload: new TestEvent("test") },
                { aggregateRootId: "id", payload: new TestEvent("test") }
            ])
        ).rejects.toThrow(IdGenerationException);

        expect(idSpy).toHaveBeenCalledTimes(2);
    });

    test("publisher throws when aggregate root name is missing", async () => {
        const store = new TestStore();
        const entity = store.addPublisher(new NoNameEntity());
        await expect(
            entity.publish([
                { aggregateRootId: "id", payload: new TestEvent("test") },
                { aggregateRootId: "id", payload: new TestEvent("test") }
            ])
        ).rejects.toThrow(MissingAggregateRootNameException);
    });
});
