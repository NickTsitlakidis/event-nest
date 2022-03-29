import { EventStore } from "./event-store";
import { StoredEvent } from "./stored-event";
import { StoredAggregateRoot } from "./stored-aggregate-root";
import { AggregateRoot } from "../domain/aggregate-root";
import { EventPayload } from "./event-payload";

export abstract class AbstractEventStore implements EventStore {
    protected constructor() {}

    abstract findByAggregateRootId(id: string): Promise<Array<StoredEvent>>;

    abstract save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>>;

    abstract generateEntityId(): Promise<string>;

    addPublisher<T extends AggregateRoot>(aggregateRoot: T): T {
        aggregateRoot.publish = async (events: Array<EventPayload>) => {
            if (events.length == 0) {
                return Promise.resolve([]);
            }

            const ids = await Promise.all(events.map(() => this.generateEntityId()));

            const domainEvents = events.map((serializable) => {
                const id = ids.pop();
                return new StoredEvent(id, aggregateRoot.id, serializable);
            });

            const toStore = new StoredAggregateRoot();
            toStore.id = aggregateRoot.id;
            toStore.version = aggregateRoot.version;
            return this.save(domainEvents, toStore).then((savedEvents) => {
                //this._eventBus.publishAll(events);
                return Promise.resolve(savedEvents);
            });
        };
        return aggregateRoot;
    }
}
