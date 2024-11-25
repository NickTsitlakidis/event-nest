import {
    AbstractEventStore,
    AggregateRoot,
    AggregateRootClass,
    DomainEventEmitter,
    EventConcurrencyException,
    getAggregateRootName,
    isNil,
    MissingAggregateRootNameException,
    StoredAggregateRoot,
    StoredEvent
} from "@event-nest/core";
import { Logger } from "@nestjs/common";
import { knex } from "knex";
import { randomUUID } from "node:crypto";

import { SchemaConfiguration } from "../schema-configuration";
import { AggregateRootRow } from "./aggregate-root-row";
import { EventRow } from "./event-row";

export class PostgreSQLEventStore extends AbstractEventStore {
    private readonly _logger: Logger;
    private readonly _schemaConfiguration: SchemaConfiguration;

    constructor(
        eventEmitter: DomainEventEmitter,
        schemaName: string,
        aggregatesTableName: string,
        eventsTableName: string,
        private readonly _knexConnection: knex.Knex
    ) {
        super(eventEmitter);
        this._logger = new Logger(PostgreSQLEventStore.name);
        this._schemaConfiguration = new SchemaConfiguration(schemaName, aggregatesTableName, eventsTableName);
    }

    /**
     * @deprecated Use {@link schemaConfiguration} instead
     */
    get aggregatesTableName(): string {
        return this.schemaConfiguration.aggregatesTable;
    }

    /**
     * @deprecated Use {@link schemaConfiguration} instead
     */
    get eventsTableName(): string {
        return this.schemaConfiguration.eventsTable;
    }

    get schemaConfiguration(): SchemaConfiguration {
        return this._schemaConfiguration;
    }

    /**
     * @deprecated Use {@link schemaConfiguration} instead
     */
    get schemaName(): string {
        return this.schemaConfiguration.schema;
    }

    async findAggregateRootVersion(id: string): Promise<number> {
        const aggregate = await this._knexConnection<AggregateRootRow>(
            this._schemaConfiguration.schemaAwareAggregatesTable
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
        const startedAt = Date.now();
        const aggregateRootName = getAggregateRootName(aggregateRootClass);
        if (isNil(aggregateRootName)) {
            this._logger.error(
                `Missing aggregate root name for class: ${aggregateRootClass.name}. Use the @AggregateRootName decorator.`
            );
            throw new MissingAggregateRootNameException(aggregateRootClass.name);
        }

        const rows = await this._knexConnection<EventRow>(this._schemaConfiguration.schemaAwareEventsTable)
            .select("*")
            .where({
                aggregate_root_id: id,
                aggregate_root_name: aggregateRootName
            });
        const duration = Date.now() - startedAt;
        this._logger.debug(`Finding events for aggregate ${id} took ${duration}ms`);
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

    async findByAggregateRootIds<T extends AggregateRoot>(
        aggregateRootClass: AggregateRootClass<T>,
        ids: string[]
    ): Promise<Record<string, Array<StoredEvent>>> {
        const aggregateRootName = getAggregateRootName(aggregateRootClass);
        if (isNil(aggregateRootName)) {
            this._logger.error(
                `Missing aggregate root name for class: ${aggregateRootClass.name}. Use the @AggregateRootName decorator.`
            );
            throw new MissingAggregateRootNameException(aggregateRootClass.name);
        }

        const rows = await this._knexConnection<EventRow>(this._schemaConfiguration.schemaAwareEventsTable)
            .select("*")
            .whereIn("aggregate_root_id", ids)
            .andWhere({
                aggregate_root_name: aggregateRootName
            });

        const grouped: Record<string, Array<StoredEvent>> = {};
        for (const row of rows) {
            if (isNil(grouped[row.aggregate_root_id])) {
                grouped[row.aggregate_root_id] = [];
            }
            grouped[row.aggregate_root_id].push(
                StoredEvent.fromStorage(
                    row.id,
                    row.aggregate_root_id,
                    row.event_name,
                    row.created_at,
                    row.aggregate_root_version,
                    row.aggregate_root_name,
                    row.payload
                )
            );
        }

        return grouped;
    }

    generateEntityId(): Promise<string> {
        return Promise.resolve(randomUUID());
    }

    async save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>> {
        const startedAt = Date.now();
        if (events.length === 0) {
            return [];
        }

        let incrementedVersion = 0;
        let finalAggregate: StoredAggregateRoot;

        try {
            await this._knexConnection.transaction(async (trx) => {
                const aggregateInDatabase = await trx<AggregateRootRow>(
                    this._schemaConfiguration.schemaAwareAggregatesTable
                )
                    .select("*")
                    .forUpdate()
                    .where("id", aggregate.id)
                    .first();

                let foundAggregate = isNil(aggregateInDatabase)
                    ? undefined
                    : new StoredAggregateRoot(aggregateInDatabase.id, aggregateInDatabase.version);

                if (isNil(foundAggregate)) {
                    aggregate.version = 0;
                    this._logger.debug(`Aggregate ${aggregate.id} does not exist. Will save it`);
                    await trx(this._schemaConfiguration.schemaAwareAggregatesTable).insert({
                        id: aggregate.id,
                        version: aggregate.version
                    });
                    foundAggregate = aggregate;
                }

                if (aggregate.isOutdated(foundAggregate)) {
                    this._logger.error(
                        `Version conflict detected for aggregate ${aggregate.id}. Expected ${aggregate.version}. Stored ${foundAggregate.version}`
                    );
                    throw new EventConcurrencyException(aggregate.id, foundAggregate.version, aggregate.version);
                }

                for (const [index, storedEvent] of events.entries()) {
                    incrementedVersion = aggregate.version + index + 1;
                    storedEvent.aggregateRootVersion = incrementedVersion;
                }

                aggregate.version = incrementedVersion;
                finalAggregate = aggregate;
                this._logger.debug(`Saving ${events.length} events for aggregate ${aggregate.id}`);

                const mapped: Array<EventRow> = events.map((storedEvent) => {
                    return {
                        aggregate_root_id: storedEvent.aggregateRootId,
                        aggregate_root_name: storedEvent.aggregateRootName,
                        aggregate_root_version: storedEvent.aggregateRootVersion,
                        created_at: storedEvent.createdAt,
                        event_name: storedEvent.eventName,
                        id: storedEvent.id,
                        payload: JSON.stringify(storedEvent.payload)
                    };
                });

                await trx<EventRow>(this._schemaConfiguration.schemaAwareEventsTable).insert(mapped);
                await trx<AggregateRootRow>(this._schemaConfiguration.schemaAwareAggregatesTable)
                    .update("version", finalAggregate.version)
                    .where("id", finalAggregate.id);
            });
        } catch (error) {
            this._logger.error("Unable to complete transaction for aggregate root with id : " + aggregate.id);
            throw error;
        }
        const duration = Date.now() - startedAt;
        this._logger.debug(`Saving events for aggregate ${aggregate.id} took ${duration}ms`);
        return events;
    }
}
