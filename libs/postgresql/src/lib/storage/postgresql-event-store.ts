import {
    AbstractEventStore,
    AggregateRoot,
    AggregateRootClass,
    DomainEventEmitter,
    EventConcurrencyException,
    MissingAggregateRootNameException,
    StoredAggregateRoot,
    StoredEvent,
    getAggregateRootName,
    isNil
} from "@event-nest/core";
import { Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import * as knex from "knex";

import { AggregateRootRow } from "./aggregate-root-row";
import { EventRow } from "./event-row";

export class PostgreSQLEventStore extends AbstractEventStore {
    private readonly _fullAggregatesTableName: string;
    private readonly _fullEventsTableName: string;
    private readonly _logger: Logger;

    constructor(
        eventEmitter: DomainEventEmitter,
        private _schemaName: string,
        private _aggregatesTableName: string,
        private _eventsTableName: string,
        private readonly _knexConnection: knex.Knex
    ) {
        super(eventEmitter);
        this._logger = new Logger(PostgreSQLEventStore.name);
        this._fullAggregatesTableName = this._schemaName + "." + this._aggregatesTableName;
        this._fullEventsTableName = this._schemaName + "." + this._eventsTableName;
    }

    get aggregatesTableName(): string {
        return this._aggregatesTableName;
    }

    get eventsTableName(): string {
        return this._eventsTableName;
    }

    get schemaName(): string {
        return this._schemaName;
    }

    async findAggregateRootVersion(id: string): Promise<number> {
        const aggregate = await this._knexConnection<AggregateRootRow>(this._fullAggregatesTableName)
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

        const rows = await this._knexConnection<EventRow>(this._fullEventsTableName).select("*").where({
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

    generateEntityId(): Promise<string> {
        return Promise.resolve(randomUUID());
    }

    async save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>> {
        if (events.length === 0) {
            return [];
        }

        let incrementedVersion = 0;
        let finalAggregate: StoredAggregateRoot;

        try {
            await this._knexConnection.transaction(async (trx) => {
                const aggregateInDb = await trx<AggregateRootRow>(this._fullAggregatesTableName)
                    .select("*")
                    .forUpdate()
                    .where("id", aggregate.id)
                    .first();

                let foundAggregate = isNil(aggregateInDb)
                    ? undefined
                    : new StoredAggregateRoot(aggregateInDb.id, aggregateInDb.version);

                if (isNil(foundAggregate)) {
                    aggregate.version = 0;
                    this._logger.debug(`Aggregate ${aggregate.id} does not exist. Will save it`);
                    await trx(this._fullAggregatesTableName).insert({
                        id: aggregate.id,
                        version: aggregate.version
                    });
                    foundAggregate = aggregate;
                }

                if (foundAggregate.version !== aggregate.version) {
                    this._logger.error(
                        `Concurrency issue for aggregate ${aggregate.id}. Expected ${aggregate.version}. Stored ${foundAggregate.version}`
                    );
                    throw new EventConcurrencyException(aggregate.id, foundAggregate.version, aggregate.version);
                }

                for (let i = 0; i < events.length; i++) {
                    incrementedVersion = aggregate.version + i + 1;
                    events[i].aggregateRootVersion = incrementedVersion;
                }

                aggregate.version = incrementedVersion;
                finalAggregate = aggregate;
                this._logger.debug(`Saving ${events.length} events for aggregate ${aggregate.id}`);

                const mapped: Array<EventRow> = events.map((ev) => {
                    return {
                        aggregate_root_id: ev.aggregateRootId,
                        aggregate_root_name: ev.aggregateRootName,
                        aggregate_root_version: ev.aggregateRootVersion,
                        created_at: ev.createdAt,
                        event_name: ev.eventName,
                        id: ev.id,
                        payload: JSON.stringify(ev.payload)
                    };
                });

                await trx<EventRow>(this._fullEventsTableName).insert(mapped);
                await trx<AggregateRootRow>(this._fullAggregatesTableName)
                    .update("version", finalAggregate.version)
                    .where("id", finalAggregate.id);
            });
        } catch (error) {
            this._logger.error("Unable to complete transaction for aggregate root with id : " + aggregate.id);
            throw error;
        }
        return events;
    }
}
