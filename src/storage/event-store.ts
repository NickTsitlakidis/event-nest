import { StoredEvent } from "./stored-event";
import { StoredAggregateRoot } from "./stored-aggregate-root";
import { AggregateRoot } from "../domain/aggregate-root";

export interface EventStore {
    addPublisher<T extends AggregateRoot>(aggregateRoot: T): T;
    findByAggregateRootId(id: string): Promise<Array<StoredEvent>>;
    save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>>;
    generateEntityId(): Promise<string>;
}
