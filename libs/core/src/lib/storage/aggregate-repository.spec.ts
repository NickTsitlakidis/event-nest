import { createMock, DeepMocked } from "@golevelup/ts-jest";

import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { AggregateRootConfig } from "../aggregate-root/aggregate-root-config";
import { ApplyEvent } from "../aggregate-root/apply-event.decorator";
import { SnapshotAware } from "../aggregate-root/snapshot-aware";
import { DomainEvent } from "../domain-event";
import { SnapshotRevisionMismatchException } from "../exceptions/snapshot-revision-mismatch-exception";
import { AggregateRepository } from "./aggregate-repository";
import { EventStore } from "./event-store";
import { StoredEvent } from "./stored-event";

@DomainEvent("repository-test-event")
class AddedValueEvent {
    constructor(public value: string) {}
}

@AggregateRootConfig({ name: "PlainRoot" })
class PlainRoot extends AggregateRoot {
    values: Array<string> = [];

    constructor(id: string) {
        super(id);
    }

    static fromEvents(id: string, events: Array<StoredEvent>): PlainRoot {
        const root = new PlainRoot(id);
        root.reconstitute(events);
        return root;
    }

    @ApplyEvent(AddedValueEvent)
    applyAddedValueEvent(event: AddedValueEvent) {
        this.values.push(event.value);
    }
}

@AggregateRootConfig({ name: "SnapshotRoot", snapshotRevision: 1 })
class SnapshotRoot extends AggregateRoot implements SnapshotAware<{ values: Array<string> }> {
    values: Array<string> = [];

    constructor(id: string) {
        super(id);
    }

    static fromEvents(
        id: string,
        events: Array<StoredEvent>,
        snapshot?: { values: Array<string> },
        aggregateRootVersion?: number
    ): SnapshotRoot {
        const root = new SnapshotRoot(id);
        root.reconstitute(events, snapshot, aggregateRootVersion);
        return root;
    }

    @ApplyEvent(AddedValueEvent)
    applyAddedValueEvent(event: AddedValueEvent) {
        this.values.push(event.value);
    }

    applySnapshot(snapshot: { values: Array<string> }): void {
        this.values = [...snapshot.values];
    }

    toSnapshot(): { values: Array<string> } {
        return { values: this.values };
    }
}

function buildStoredEvent(
    id: string,
    aggregateRootId: string,
    aggregateRootName: string,
    version: number,
    value: string
) {
    return StoredEvent.fromStorage(
        id,
        aggregateRootId,
        "repository-test-event",
        new Date(),
        version,
        aggregateRootName,
        {
            value
        }
    );
}

describe("AggregateRepository", () => {
    let eventStore: DeepMocked<EventStore>;

    beforeEach(() => {
        eventStore = createMock<EventStore>();
        eventStore.addPublisher.mockImplementation((aggregate) => {
            aggregate.publish = jest.fn().mockResolvedValue([]);
            return aggregate;
        });
    });

    describe("load", () => {
        test("reconstitutes a non-snapshot-aware aggregate from all its events", async () => {
            eventStore.findByAggregateRootId.mockResolvedValue([
                buildStoredEvent("ev1", "id1", "PlainRoot", 1, "first"),
                buildStoredEvent("ev2", "id1", "PlainRoot", 2, "second")
            ]);
            const repository = new AggregateRepository(eventStore, PlainRoot, PlainRoot.fromEvents);

            const loaded = await repository.load("id1");

            expect(loaded?.values).toEqual(["first", "second"]);
            expect(loaded?.version).toBe(2);
            expect(eventStore.findByAggregateRootId).toHaveBeenCalledWith(PlainRoot, "id1");
            expect(eventStore.findWithSnapshot).not.toHaveBeenCalled();
        });

        test("returns undefined when there is no persisted state", async () => {
            eventStore.findByAggregateRootId.mockResolvedValue([]);
            const repository = new AggregateRepository(eventStore, PlainRoot, PlainRoot.fromEvents);

            const loaded = await repository.load("id1");

            expect(loaded).toBeUndefined();
        });

        test("connects the loaded aggregate to the event store", async () => {
            eventStore.findByAggregateRootId.mockResolvedValue([
                buildStoredEvent("ev1", "id1", "PlainRoot", 1, "first")
            ]);
            const repository = new AggregateRepository(eventStore, PlainRoot, PlainRoot.fromEvents);

            const loaded = await repository.load("id1");

            expect(eventStore.addPublisher).toHaveBeenCalledTimes(1);
            expect(eventStore.addPublisher).toHaveBeenCalledWith(loaded);
        });

        test("reconstitutes a snapshot-aware aggregate from a snapshot and its newer events", async () => {
            eventStore.findWithSnapshot.mockResolvedValue({
                aggregateRootVersion: 3,
                events: [buildStoredEvent("ev3", "id1", "SnapshotRoot", 3, "after-snapshot")],
                snapshot: { values: ["from-snapshot"] }
            });
            const repository = new AggregateRepository(eventStore, SnapshotRoot, SnapshotRoot.fromEvents);

            const loaded = await repository.load("id1");

            expect(loaded?.values).toEqual(["from-snapshot", "after-snapshot"]);
            expect(loaded?.version).toBe(3);
            expect(eventStore.findWithSnapshot).toHaveBeenCalledWith(SnapshotRoot, "id1");
            expect(eventStore.findByAggregateRootId).not.toHaveBeenCalled();
        });

        test("reconstitutes a snapshot-aware aggregate when only a snapshot exists", async () => {
            eventStore.findWithSnapshot.mockResolvedValue({
                aggregateRootVersion: 2,
                events: [],
                snapshot: { values: ["from-snapshot"] }
            });
            const repository = new AggregateRepository(eventStore, SnapshotRoot, SnapshotRoot.fromEvents);

            const loaded = await repository.load("id1");

            expect(loaded?.values).toEqual(["from-snapshot"]);
            expect(loaded?.version).toBe(2);
        });

        test("returns undefined when a snapshot-aware aggregate has no events and no snapshot", async () => {
            eventStore.findWithSnapshot.mockResolvedValue({ aggregateRootVersion: 0, events: [], snapshot: undefined });
            const repository = new AggregateRepository(eventStore, SnapshotRoot, SnapshotRoot.fromEvents);

            const loaded = await repository.load("id1");

            expect(loaded).toBeUndefined();
        });

        test("falls back to a full event replay when the snapshot revision doesn't match", async () => {
            eventStore.findWithSnapshot.mockRejectedValue(new SnapshotRevisionMismatchException("SnapshotRoot"));
            eventStore.findByAggregateRootId.mockResolvedValue([
                buildStoredEvent("ev1", "id1", "SnapshotRoot", 1, "first"),
                buildStoredEvent("ev2", "id1", "SnapshotRoot", 2, "second")
            ]);
            const repository = new AggregateRepository(eventStore, SnapshotRoot, SnapshotRoot.fromEvents);

            const loaded = await repository.load("id1");

            expect(loaded?.values).toEqual(["first", "second"]);
            expect(eventStore.findByAggregateRootId).toHaveBeenCalledWith(SnapshotRoot, "id1");
        });

        test("rethrows other errors of the snapshot retrieval", async () => {
            eventStore.findWithSnapshot.mockRejectedValue(new Error("boom"));
            const repository = new AggregateRepository(eventStore, SnapshotRoot, SnapshotRoot.fromEvents);

            await expect(repository.load("id1")).rejects.toThrow("boom");
            expect(eventStore.findByAggregateRootId).not.toHaveBeenCalled();
        });
    });

    describe("save", () => {
        test("connects the aggregate to the event store and commits its events", async () => {
            const repository = new AggregateRepository(eventStore, PlainRoot, PlainRoot.fromEvents);
            const root = new PlainRoot("id1");
            root.append(new AddedValueEvent("first"));

            const saved = await repository.save(root);

            expect(saved).toBe(root);
            expect(eventStore.addPublisher).toHaveBeenCalledWith(root);
            expect(root.publish).toHaveBeenCalledTimes(1);
            expect(
                (root.publish as jest.Mock).mock.calls[0][0].map((event: { payload: AddedValueEvent }) => event.payload)
            ).toEqual([new AddedValueEvent("first")]);
            expect(root.uncommittedEvents).toEqual([]);
        });

        test("commits without publishing when there are no uncommitted events", async () => {
            const repository = new AggregateRepository(eventStore, PlainRoot, PlainRoot.fromEvents);
            const root = new PlainRoot("id1");

            const saved = await repository.save(root);

            expect(saved).toBe(root);
            expect(root.publish).not.toHaveBeenCalled();
        });
    });
});
