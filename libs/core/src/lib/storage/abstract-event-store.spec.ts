import { createMock } from "@golevelup/ts-jest";

import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { AggregateRootName } from "../aggregate-root/aggregate-root-name";
import { DomainEventEmitter } from "../domain-event-emitter";
import { IdGenerationException } from "../exceptions/id-generation-exception";
import { MissingAggregateRootNameException } from "../exceptions/missing-aggregate-root-name-exception";
import { UnknownEventVersionException } from "../exceptions/unknown-event-version-exception";
import { PublishedDomainEvent } from "../published-domain-event";
import { AbstractEventStore } from "./abstract-event-store";
import { StoredAggregateRoot } from "./stored-aggregate-root";
import { StoredEvent } from "./stored-event";

const eventEmitter = createMock<DomainEventEmitter>();

class TestStore extends AbstractEventStore {
    savedAggregate: StoredAggregateRoot | undefined;
    savedEvents: Array<StoredEvent> = [];
    constructor() {
        super(eventEmitter);
    }

    findAggregateRootVersion(): Promise<number> {
        return Promise.resolve(0);
    }

    findByAggregateRootId(): Promise<Array<StoredEvent>> {
        return Promise.resolve([]);
    }

    generateEntityId(): Promise<string> {
        return Promise.resolve("generated-id");
    }

    save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>> {
        this.savedEvents = events;
        this.savedAggregate = aggregate;
        return Promise.resolve(
            events.map((event) => {
                return StoredEvent.fromStorage(
                    event.id,
                    event.aggregateRootId,
                    event.aggregateRootName,
                    event.createdAt,
                    aggregate.version + 100,
                    "name",
                    event.payload
                );
            })
        );
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
        const creationDate = new Date();
        const store = new TestStore();
        const entity = store.addPublisher(new TestEntity());
        const toPublish = [{ aggregateRootId: "id", occurredAt: creationDate, payload: new TestEvent("test") }];
        const expectedEmissions: Array<PublishedDomainEvent<object>> = [
            {
                aggregateRootId: "id",
                eventId: "generated-id",
                occurredAt: creationDate,
                payload: new TestEvent("test"),
                version: 100
            }
        ];
        eventEmitter.emitMultiple.mockResolvedValue("whatever");
        await entity.publish(toPublish);
        expect(entity.version).toBe(100);
        expect(store.savedEvents).toEqual([
            StoredEvent.fromPublishedEvent("generated-id", "id", "test-entity", new TestEvent("test"), creationDate)
        ]);
        expect(store.savedAggregate?.id).toBe("id");
        expect(entity.version).toEqual(100);
        expect(eventEmitter.emitMultiple).toHaveBeenCalledWith(expectedEmissions);
        expect(eventEmitter.emitMultiple).toHaveBeenCalledTimes(1);
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
                { aggregateRootId: "id", occurredAt: new Date(), payload: new TestEvent("test") },
                { aggregateRootId: "id", occurredAt: new Date(), payload: new TestEvent("test") }
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
                { aggregateRootId: "id", occurredAt: new Date(), payload: new TestEvent("test") },
                { aggregateRootId: "id", occurredAt: new Date(), payload: new TestEvent("test") }
            ])
        ).rejects.toThrow(IdGenerationException);

        expect(idSpy).toHaveBeenCalledTimes(2);
    });

    test("publisher throws when aggregate root name is missing", async () => {
        const store = new TestStore();
        const entity = store.addPublisher(new NoNameEntity());
        await expect(
            entity.publish([
                { aggregateRootId: "id", occurredAt: new Date(), payload: new TestEvent("test") },
                { aggregateRootId: "id", occurredAt: new Date(), payload: new TestEvent("test") }
            ])
        ).rejects.toThrow(MissingAggregateRootNameException);
    });

    test("publisher throws when event version is not found", async () => {
        const store = new TestStore();
        jest.spyOn(store, "save").mockResolvedValueOnce([]);
        const entity = store.addPublisher(new TestEntity());
        await expect(
            entity.publish([
                { aggregateRootId: "id", occurredAt: new Date(), payload: new TestEvent("test") },
                { aggregateRootId: "id", occurredAt: new Date(), payload: new TestEvent("test") }
            ])
        ).rejects.toThrow(UnknownEventVersionException);
    });
});
