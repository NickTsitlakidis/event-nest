import { SourceEvent } from "./source-event";
import { VersionedAggregateRoot } from "./versioned-aggregate-root";

export interface EventStore {
    findByAggregateRootId(id: string): Promise<Array<SourceEvent>>;
    save(events: Array<SourceEvent>, aggregate: VersionedAggregateRoot): Promise<Array<SourceEvent>>;
}
