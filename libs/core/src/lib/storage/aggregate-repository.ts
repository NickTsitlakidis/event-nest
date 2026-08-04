import { Logger } from "@nestjs/common";
import { isNil } from "es-toolkit";

import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { getAggregateRootSnapshotRevision } from "../aggregate-root/aggregate-root-config";
import { SnapshotRevisionMismatchException } from "../exceptions/snapshot-revision-mismatch-exception";
import { AggregateRootClass, AggregateRootSnapshot, EventStore } from "./event-store";
import { StoredEvent } from "./stored-event";

/**
 * A function that creates an aggregate root instance from its persisted state. Typically this matches a static
 * factory method on the aggregate root class which calls {@link AggregateRoot:reconstitute} with the provided
 * events, optional snapshot and optional aggregate root version. Snapshot-aware factories should forward the
 * version to {@link AggregateRoot:reconstitute}, otherwise an aggregate whose snapshot has no newer events would
 * resolve its version to 0.
 */
export type AggregateRootFactory<T extends AggregateRoot> = (
    id: string,
    events: Array<StoredEvent>,
    snapshot?: AggregateRootSnapshot<T>,
    aggregateRootVersion?: number
) => T;

/**
 * A convenience wrapper around the {@link EventStore} for the common load -> mutate -> commit flow of a single
 * aggregate root class. It takes care of retrieving the persisted state (using snapshots when the class is
 * snapshot-aware), calling the provided factory and connecting the aggregate root to the event store.
 *
 * The repository is a plain class which is not managed by the NestJS dependency injection system. Create instances
 * of it where needed by injecting the {@link EventStore} using the {@link EVENT_STORE} symbol.
 */
export class AggregateRepository<T extends AggregateRoot> {
    private readonly _logger: Logger;

    constructor(
        private readonly _eventStore: EventStore,
        private readonly _aggregateRootClass: AggregateRootClass<T>,
        private readonly _factory: AggregateRootFactory<T>
    ) {
        this._logger = new Logger(AggregateRepository.name);
    }

    /**
     * Loads the aggregate root with the provided id by retrieving its persisted state and passing it to the factory.
     * When the aggregate root class is snapshot-aware, the latest snapshot is used and only the events that occurred
     * after it are replayed. If the stored snapshot revision doesn't match the revision of the class, the repository
     * falls back to a full event replay.
     *
     * The returned aggregate root is already connected to the event store, so it can be committed directly.
     * @param id The unique id of the aggregate root object
     * @returns The reconstituted aggregate root, or undefined when there is no persisted state for the id
     */
    async load(id: string): Promise<T | undefined> {
        const { aggregateRootVersion, events, snapshot } = await this.find(id);
        if (events.length === 0 && isNil(snapshot)) {
            return undefined;
        }

        const aggregate = this._factory(id, events, snapshot, aggregateRootVersion);
        return this._eventStore.addPublisher(aggregate);
    }

    /**
     * Connects the provided aggregate root to the event store and commits its uncommitted events.
     * @param aggregate The aggregate root to be committed
     * @returns The committed aggregate root
     */
    async save(aggregate: T): Promise<T> {
        return this._eventStore.addPublisher(aggregate).commit();
    }

    private async find(
        id: string
    ): Promise<{ aggregateRootVersion?: number; events: Array<StoredEvent>; snapshot?: AggregateRootSnapshot<T> }> {
        const snapshotRevision = getAggregateRootSnapshotRevision(this._aggregateRootClass);
        if (isNil(snapshotRevision)) {
            return {
                events: await this._eventStore.findByAggregateRootId(this._aggregateRootClass, id),
                snapshot: undefined
            };
        }

        try {
            return await this._eventStore.findWithSnapshot(this._aggregateRootClass, id);
        } catch (error) {
            if (error instanceof SnapshotRevisionMismatchException) {
                this._logger.warn(
                    `Stored snapshot revision doesn't match for aggregate ${id}. Falling back to full event replay`
                );
                return {
                    events: await this._eventStore.findByAggregateRootId(this._aggregateRootClass, id),
                    snapshot: undefined
                };
            }
            throw error;
        }
    }
}
