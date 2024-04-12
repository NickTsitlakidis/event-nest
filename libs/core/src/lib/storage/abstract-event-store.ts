import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { AggregateRootEvent } from "../aggregate-root/aggregate-root-event";
import { getAggregateRootName } from "../aggregate-root/aggregate-root-name";
import { DomainEventEmitter } from "../domain-event-emitter";
import { IdGenerationException } from "../exceptions/id-generation-exception";
import { MissingAggregateRootNameException } from "../exceptions/missing-aggregate-root-name-exception";
import { UnknownEventVersionException } from "../exceptions/unknown-event-version-exception";
import { PublishedDomainEvent } from "../published-domain-event";
import { hasAllValues, isNil } from "../utils/type-utils";
import { AggregateRootClass, EventStore } from "./event-store";
import { StoredAggregateRoot } from "./stored-aggregate-root";
import { StoredEvent } from "./stored-event";

/**
 * An abstract implementation of the {@link EventStore} interface.
 * Regardless of the database technology, all subclasses should have a common implementation
 * of the {@link EventStore:addPublisher} method and this is why this class exists.
 */
export abstract class AbstractEventStore implements EventStore {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected constructor(private _eventEmitter: DomainEventEmitter) {}

    addPublisher<T extends AggregateRoot>(aggregateRoot: T): T {
        aggregateRoot.publish = async (events: Array<AggregateRootEvent<object>>) => {
            const aggregateRootName = getAggregateRootName(aggregateRoot.constructor);
            if (isNil(aggregateRootName)) {
                throw new MissingAggregateRootNameException(aggregateRoot.constructor.name);
            }

            if (events.length == 0) {
                return Promise.resolve([]);
            }

            const ids = await Promise.all(events.map(() => this.generateEntityId()));
            if (ids.length !== events.length || !hasAllValues(ids)) {
                throw new IdGenerationException(ids.length, events.length);
            }
            const published: Array<PublishedDomainEvent<object>> = [];
            const storedEvents: Array<StoredEvent> = [];

            events.forEach((event) => {
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
            });

            const toStore = new StoredAggregateRoot(aggregateRoot.id, aggregateRoot.version);
            const saved = await this.save(storedEvents, toStore);
            published.forEach((event) => {
                const found = saved.find((s) => s.id === event.eventId);
                if (isNil(found)) {
                    throw new UnknownEventVersionException(event.eventId, event.aggregateRootId);
                }

                event.version = found.aggregateRootVersion;
            });

            this._eventEmitter.emitMultiple(published);
            aggregateRoot.resolveVersion(saved);
            return saved;
        };
        return aggregateRoot;
    }

    abstract findAggregateRootVersion(id: string): Promise<number>;

    abstract findByAggregateRootId<T extends AggregateRoot>(
        aggregateRootClass: AggregateRootClass<T>,
        id: string
    ): Promise<Array<StoredEvent>>;

    abstract generateEntityId(): Promise<string>;

    abstract save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>>;
}
