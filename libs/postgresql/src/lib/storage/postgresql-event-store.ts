import {
    AbstractEventStore,
    AggregateRoot,
    AggregateRootClass,
    DomainEventEmitter,
    getAggregateRootName,
    isNil,
    MissingAggregateRootNameException,
    StoredAggregateRoot,
    StoredEvent
} from "@event-nest/core";
import { Logger } from "@nestjs/common";
import * as knex from "knex";
import { v4 as uuidv4 } from "uuid";
import { AggregateRootRow } from "./aggregate-root-row";
import { EventRow } from "./event-row";

export class PostgreSQLEventStore extends AbstractEventStore {
    private readonly _logger: Logger;

    constructor(
        eventEmitter: DomainEventEmitter,
        private readonly _knexConnection: knex.Knex,
        private readonly _schemaName: string,
        private readonly _aggregatesTableName: string,
        private readonly _eventsTableName: string
    ) {
        super(eventEmitter);
        this._logger = new Logger(PostgreSQLEventStore.name);
    }

    generateEntityId(): Promise<string> {
        return Promise.resolve(uuidv4());
    }

    async save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>> {
        return [];
    }

    async findAggregateRootVersion(id: string): Promise<number> {
        const aggregate = await this._knexConnection<AggregateRootRow>(
            this._schemaName + "." + this._aggregatesTableName
        )
            .select("version")
            .where("id", id)
            .first();
        if (isNil(aggregate)) {
            return -1;
        }
        return aggregate.version;
    }

    async findByAggregateRootId<T extends AggregateRoot>(
        aggregateRootClass: AggregateRootClass<T>,
        id: string
    ): Promise<Array<StoredEvent>> {
        const aggregateRootName = getAggregateRootName(aggregateRootClass);
        if (isNil(aggregateRootName)) {
            this._logger.error(
                `Missing aggregate root name for class: ${aggregateRootClass.name}. Use the @AggregateRootName decorator.`
            );
            throw new MissingAggregateRootNameException(aggregateRootClass.name);
        }

        const rows = await this._knexConnection<EventRow>(this._schemaName + "." + this._eventsTableName)
            .select("*")
            .where({
                aggregate_root_id: id,
                aggregate_root_name: aggregateRootName
            });
        if (rows.length > 0) {
            return rows.map((row) => {
                return StoredEvent.fromStorage(
                    row.id,
                    row.aggregate_root_id,
                    row.event_name,
                    row.created_at,
                    row.aggregate_root_version,
                    row.aggregate_root_name,
                    row.payload
                );
            });
        }

        return [];
    }
}
