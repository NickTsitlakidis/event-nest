import { EventStore } from "./event-store";
import { StoredEvent } from "./stored-event";
import { AggregateRoot } from "../domain/aggregate-root";
import { StoredAggregateRoot } from "./stored-aggregate-root";
import { IdGenerationException } from "./id-generation-exception";
import { AggregateRootAware } from "../domain/aggregate-root-aware";

export abstract class AbstractEventStore implements EventStore {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected constructor() {}

    abstract findByAggregateRootId(id: string): Promise<Array<StoredEvent>>;

    abstract save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>>;

    abstract generateEntityId(): Promise<string>;

    addPublisher<T extends AggregateRoot>(aggregateRoot: T): T {
        aggregateRoot.publish = async (events: Array<AggregateRootAware<object>>) => {
            if (events.length == 0) {
                return Promise.resolve([]);
            }

            const ids = await Promise.all(events.map(() => this.generateEntityId()));
            if (ids.length !== events.length) {
                throw new IdGenerationException(ids.length, events.length);
            }
            const storedEvents = events.map((serializable) => {
                const id = ids.pop()!;
                return StoredEvent.fromPublishedEvent(id, aggregateRoot.id, serializable.payload);
            });

            const toStore = new StoredAggregateRoot(aggregateRoot.id, aggregateRoot.version);
            return this.save(storedEvents, toStore).then((savedEvents) => {
                //this._eventBus.publishAll(events);
                return Promise.resolve(savedEvents);
            });
        };
        return aggregateRoot;
    }
}
