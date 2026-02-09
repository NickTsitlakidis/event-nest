import { isNil } from "es-toolkit";

import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { getAggregateRootName } from "../aggregate-root/aggregate-root-config";
import { AggregateRootEvent } from "../aggregate-root/aggregate-root-event";
import { DomainEventEmitter } from "../domain-event-emitter";
import { IdGenerationException } from "../exceptions/id-generation-exception";
import { MissingAggregateRootNameException } from "../exceptions/missing-aggregate-root-name-exception";
import { UnknownEventVersionException } from "../exceptions/unknown-event-version-exception";
import { PublishedDomainEvent } from "../published-domain-event";
import { hasAllValues } from "../utils/type-utils";
import { AggregateRootClass, AggregateRootSnapshot, EventStore } from "./event-store";
import { AbstractSnapshotStore } from "./snapshot/abstract-snapshot-store";
import { StoredAggregateRoot } from "./stored-aggregate-root";
import { StoredEvent } from "./stored-event";

/**
 * An abstract implementation of the {@link EventStore} interface.
 * Regardless of the database technology, all subclasses should have a common implementation
 * of the {@link EventStore:addPublisher} method and this is why this class exists.
 */
export abstract class AbstractEventStore implements EventStore {
    protected constructor(
        private _eventEmitter: DomainEventEmitter,
        protected _snapshotStore: AbstractSnapshotStore
    ) {}

    addPublisher<T extends AggregateRoot>(aggregateRoot: T): T {
        aggregateRoot.publish = async (events: Array<AggregateRootEvent<object>>) => {
            const aggregateRootName = getAggregateRootName(aggregateRoot.constructor);
            if (isNil(aggregateRootName)) {
                throw new MissingAggregateRootNameException(aggregateRoot.constructor.name);
            }

            if (events.length === 0) {
                return [];
            }

            const ids = await Promise.all(events.map(() => this.generateEntityId()));
            if (ids.length !== events.length || !hasAllValues(ids)) {
                throw new IdGenerationException(ids.length, events.length);
            }
            const shouldCreateSnapshot = this._snapshotStore.shouldCreateSnapshot(aggregateRoot);
            const published: Array<PublishedDomainEvent<object>> = [];
            const storedEvents: Array<StoredEvent> = [];

            for (const event of events) {
                const id = ids.pop() as string;
                storedEvents.push(
                    StoredEvent.fromPublishedEvent(
                        id,
                        aggregateRoot.id,
                        aggregateRootName,
                        event.payload,
                        event.occurredAt
                    )
                );
                published.push({
                    ...event,
                    eventId: id,
                    version: aggregateRoot.version
                });
            }

            const toStore = new StoredAggregateRoot(aggregateRoot.id, aggregateRoot.version);
            const saved = await this.save(storedEvents, toStore);

            if (shouldCreateSnapshot) {
                await this._snapshotStore.create(aggregateRoot);
            }

            for (const publishedEvent of published) {
                const found = saved.find((s) => s.id === publishedEvent.eventId);
                if (isNil(found)) {
                    throw new UnknownEventVersionException(publishedEvent.eventId, publishedEvent.aggregateRootId);
                }

                publishedEvent.version = found.aggregateRootVersion;
            }

            aggregateRoot.resolveVersion(saved);
            await this._eventEmitter.emitMultiple(published);
            return saved;
        };
        return aggregateRoot;
    }

    abstract findAggregateRootVersion(id: string): Promise<number>;

    abstract findByAggregateRootId<T extends AggregateRoot>(
        aggregateRootClass: AggregateRootClass<T>,
        id: string
    ): Promise<Array<StoredEvent>>;

    abstract findByAggregateRootIds<T extends AggregateRoot>(
        aggregateRootClass: AggregateRootClass<T>,
        ids: string[]
    ): Promise<Record<string, Array<StoredEvent>>>;

    abstract findWithSnapshot<T extends AggregateRoot>(
        aggregateRootClass: AggregateRootClass<T>,
        id: string
    ): Promise<{
        events: Array<StoredEvent>;
        snapshot?: AggregateRootSnapshot<T>;
    }>;

    abstract generateEntityId(): Promise<string>;

    abstract save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>>;
}
