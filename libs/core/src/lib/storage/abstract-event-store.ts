import { AggregateRootClass, EventStore } from "./event-store";
import { StoredEvent } from "./stored-event";
import { AggregateRoot } from "../aggregate-root";
import { StoredAggregateRoot } from "./stored-aggregate-root";
import { IdGenerationException } from "../exceptions/id-generation-exception";
import { AggregateRootAwareEvent } from "../aggregate-root-aware-event";
import { hasAllValues, isNil } from "../utils/type-utils";
import { DomainEventEmitter } from "../domain-event-emitter";
import { getAggregateRootName } from "../aggregate-root-name";
import { MissingAggregateRootNameException } from "../exceptions/missing-aggregate-root-name-exception";

/**
 * An abstract implementation of the {@link EventStore} interface.
 * Regardless of the database technology, all subclasses should have a common implementation
 * of the {@link EventStore:addPublisher} method and this is why this class exists.
 */
export abstract class AbstractEventStore implements EventStore {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected constructor(private _eventEmitter: DomainEventEmitter) {}

    abstract findByAggregateRootId<T extends AggregateRoot>(
        aggregateRootClass: AggregateRootClass<T>,
        id: string
    ): Promise<Array<StoredEvent>>;

    abstract findAggregateRootVersion(id: string): Promise<number>;

    abstract save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>>;

    abstract generateEntityId(): Promise<string>;

    addPublisher<T extends AggregateRoot>(aggregateRoot: T): T {
        aggregateRoot.publish = async (events: Array<AggregateRootAwareEvent<object>>) => {
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
            const storedEvents = events.map((arAwareEvent) => {
                const id = ids.pop()!;
                return StoredEvent.fromPublishedEvent(
                    id,
                    aggregateRoot.id,
                    aggregateRootName,
                    arAwareEvent.payload,
                    arAwareEvent.occurredAt
                );
            });

            const toStore = new StoredAggregateRoot(aggregateRoot.id, aggregateRoot.version);
            return this.save(storedEvents, toStore).then((savedEvents) => {
                this._eventEmitter.emitMultiple(events);
                return Promise.resolve(savedEvents);
            });
        };
        return aggregateRoot;
    }
}
