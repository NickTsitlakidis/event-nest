import {
    AbstractEventStore,
    AbstractSnapshotStore,
    AggregateRoot,
    AggregateRootClass,
    AggregateRootSnapshot,
    DomainEventEmitter,
    EventConcurrencyException,
    getAggregateRootName,
    MissingAggregateRootNameException,
    StoredAggregateRoot,
    StoredEvent
} from "@event-nest/core";
import { Logger } from "@nestjs/common";
import { groupBy, isNil, isNotNil, isNumber, maxBy, uniq } from "es-toolkit";
import { isObject } from "es-toolkit/compat";
import { Knex } from "knex";
import { randomUUID } from "node:crypto";

import { SchemaConfiguration } from "../schema-configuration";
import { AggregateRootRow } from "./aggregate-root-row";
import { EventRow } from "./event-row";

const AGGREGATE_ID_QUERY_CHUNK_SIZE = 2000;
const EVENT_INSERT_CHUNK_SIZE = 250;
const DUPLICATE_KEY_ERRORS = new Set([2601, 2627]);

export class MSSQLEventStore extends AbstractEventStore {
    private readonly _logger = new Logger(MSSQLEventStore.name);

    constructor(
        eventEmitter: DomainEventEmitter,
        snapshotStore: AbstractSnapshotStore,
        private readonly _schemaConfiguration: SchemaConfiguration,
        private readonly _knexConnection: Knex
    ) {
        super(eventEmitter, snapshotStore);
    }

    get schemaConfiguration(): SchemaConfiguration {
        return this._schemaConfiguration;
    }

    async findAggregateRootVersion(id: string): Promise<number> {
        const aggregate = await this._knexConnection<AggregateRootRow>(this._schemaConfiguration.aggregatesTable)
            .withSchema(this._schemaConfiguration.schema)
            .select("version")
            .where("id", id)
            .first();
        return isNil(aggregate) ? -1 : aggregate.version;
    }

    async findByAggregateRootId<T extends AggregateRoot>(
        aggregateRootClass: AggregateRootClass<T>,
        id: string
    ): Promise<Array<StoredEvent>> {
        return this.findEvents(id, this.resolveAggregateRootName(aggregateRootClass));
    }

    async findByAggregateRootIds<T extends AggregateRoot>(
        aggregateRootClass: AggregateRootClass<T>,
        ids: string[]
    ): Promise<Record<string, Array<StoredEvent>>> {
        if (ids.length === 0) {
            return {};
        }

        const aggregateRootName = this.resolveAggregateRootName(aggregateRootClass);
        const uniqueIds = uniq(ids);
        const rows: EventRow[] = [];

        for (let index = 0; index < uniqueIds.length; index += AGGREGATE_ID_QUERY_CHUNK_SIZE) {
            const chunk = uniqueIds.slice(index, index + AGGREGATE_ID_QUERY_CHUNK_SIZE);
            const resultRows = await this._knexConnection<EventRow>(this._schemaConfiguration.eventsTable)
                .withSchema(this._schemaConfiguration.schema)
                .select("*")
                .whereIn("aggregate_root_id", chunk)
                .andWhere("aggregate_root_name", aggregateRootName)
                .orderBy("aggregate_root_version", "asc");
            rows.push(...resultRows);
        }

        const grouped: Record<string, Array<StoredEvent>> = groupBy(
            rows.map((row) => this.mapToStoredEvent(row)),
            (row) => row.aggregateRootId
        );
        for (const events of Object.values(grouped)) {
            events.sort((left, right) => left.aggregateRootVersion - right.aggregateRootVersion);
        }
        return grouped;
    }

    async findWithSnapshot<T extends AggregateRoot>(
        aggregateRootClass: AggregateRootClass<T>,
        id: string
    ): Promise<{ aggregateRootVersion?: number; events: Array<StoredEvent>; snapshot?: AggregateRootSnapshot<T> }> {
        const { aggregateRootName, snapshot } = await this.resolveSnapshot(aggregateRootClass, id);
        if (isNil(snapshot)) {
            const events = await this.findEvents(id, aggregateRootName);
            return {
                aggregateRootVersion: maxBy(events, (event) => event.aggregateRootVersion)?.aggregateRootVersion ?? 0,
                events,
                snapshot: undefined
            };
        }

        const events = await this.findEvents(id, aggregateRootName, snapshot.aggregateRootVersion);
        const eventMax = maxBy(events, (event) => event.aggregateRootVersion);
        return {
            aggregateRootVersion: isNotNil(eventMax) ? eventMax.aggregateRootVersion : snapshot.aggregateRootVersion,
            events,
            snapshot: snapshot.payload as AggregateRootSnapshot<T>
        };
    }

    generateEntityId(): Promise<string> {
        return Promise.resolve(randomUUID());
    }

    async purgeAggregate(id: string): Promise<void> {
        const startedAt = Date.now();
        try {
            await this._knexConnection.transaction(async (transaction) => {
                await this._snapshotStore.deleteByAggregateId(id, transaction);

                await transaction<EventRow>(this._schemaConfiguration.eventsTable)
                    .withSchema(this._schemaConfiguration.schema)
                    .where("aggregate_root_id", id)
                    .delete();

                await transaction<AggregateRootRow>(this._schemaConfiguration.aggregatesTable)
                    .withSchema(this._schemaConfiguration.schema)
                    .where("id", id)
                    .delete();
            });
        } catch (error) {
            this._logger.error(`Unable to purge aggregate root with id: ${id}`);
            throw error;
        }
        this._logger.debug(`Purging aggregate ${id} took ${Date.now() - startedAt}ms`);
    }

    async save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>> {
        if (events.length === 0) {
            return [];
        }

        const startedAt = Date.now();
        const expectedVersion = aggregate.version;
        let committedVersion = expectedVersion;
        let assignedVersions: number[] = [];

        try {
            await this._knexConnection.transaction(async (transaction) => {
                const aggregateInDatabase = await this.findAggregateForUpdate(transaction, aggregate.id);
                let currentVersion = aggregateInDatabase?.version;

                if (isNil(currentVersion)) {
                    if (expectedVersion !== 0) {
                        throw new EventConcurrencyException(aggregate.id, -1, expectedVersion);
                    }
                    await transaction<AggregateRootRow>(this._schemaConfiguration.aggregatesTable)
                        .withSchema(this._schemaConfiguration.schema)
                        .insert({
                            id: aggregate.id,
                            version: 0
                        });
                    currentVersion = 0;
                } else if (currentVersion !== expectedVersion) {
                    throw new EventConcurrencyException(aggregate.id, currentVersion, expectedVersion);
                }

                assignedVersions = events.map((_, index) => currentVersion + index + 1);
                const rows = events.map<EventRow>((event, index) => ({
                    aggregate_root_id: event.aggregateRootId,
                    aggregate_root_name: event.aggregateRootName,
                    aggregate_root_version: assignedVersions[index],
                    created_at: event.createdAt,
                    event_name: event.eventName,
                    id: event.id,
                    payload: JSON.stringify(event.payload)
                }));

                for (let index = 0; index < rows.length; index += EVENT_INSERT_CHUNK_SIZE) {
                    await transaction<EventRow>(this._schemaConfiguration.eventsTable)
                        .withSchema(this._schemaConfiguration.schema)
                        .insert(rows.slice(index, index + EVENT_INSERT_CHUNK_SIZE));
                }

                committedVersion = currentVersion + events.length;
                const updated = await transaction<AggregateRootRow>(this._schemaConfiguration.aggregatesTable)
                    .withSchema(this._schemaConfiguration.schema)
                    .where({
                        id: aggregate.id,
                        version: currentVersion
                    })
                    .update({ version: committedVersion });
                if (updated !== 1) {
                    throw new EventConcurrencyException(aggregate.id, currentVersion, expectedVersion);
                }
            });
        } catch (error) {
            this._logger.error(`Unable to complete transaction for aggregate root with id: ${aggregate.id}`);
            const isDuplicateKeyError =
                isObject(error) &&
                isNotNil(error) &&
                "number" in error &&
                isNumber(error.number) &&
                DUPLICATE_KEY_ERRORS.has(error.number);
            if (isDuplicateKeyError) {
                const databaseVersion = await this.findAggregateRootVersion(aggregate.id);
                if (databaseVersion !== expectedVersion) {
                    throw new EventConcurrencyException(aggregate.id, databaseVersion, expectedVersion);
                }
            }
            throw error;
        }

        for (const [index, event] of events.entries()) {
            event.aggregateRootVersion = assignedVersions[index];
        }
        aggregate.version = committedVersion;
        this._logger.debug(`Saving events for aggregate ${aggregate.id} took ${Date.now() - startedAt}ms`);
        return events;
    }

    private async findAggregateForUpdate(
        transaction: Knex.Transaction,
        id: string
    ): Promise<AggregateRootRow | undefined> {
        const rows = await transaction.raw<AggregateRootRow[]>(
            "select [id], [version] from ?? with (updlock, holdlock) where [id] = ?",
            [this._schemaConfiguration.schemaAwareAggregatesTable, id]
        );
        return rows[0];
    }

    private async findEvents(id: string, aggregateRootName: string, minVersion?: number): Promise<Array<StoredEvent>> {
        const startedAt = Date.now();
        let query = this._knexConnection<EventRow>(this._schemaConfiguration.eventsTable)
            .withSchema(this._schemaConfiguration.schema)
            .select("*")
            .where({
                aggregate_root_id: id,
                aggregate_root_name: aggregateRootName
            });

        if (!isNil(minVersion)) {
            query = query.andWhere("aggregate_root_version", ">", minVersion);
        }

        const rows = await query.orderBy("aggregate_root_version", "asc");
        this._logger.debug(`Finding events for aggregate ${id} took ${Date.now() - startedAt}ms`);
        return rows.map((row) => this.mapToStoredEvent(row));
    }

    private mapToStoredEvent(row: EventRow): StoredEvent {
        return StoredEvent.fromStorage(
            row.id,
            row.aggregate_root_id,
            row.event_name,
            row.created_at,
            row.aggregate_root_version,
            row.aggregate_root_name,
            JSON.parse(row.payload)
        );
    }

    private resolveAggregateRootName<T extends AggregateRoot>(aggregateRootClass: AggregateRootClass<T>): string {
        const name = getAggregateRootName(aggregateRootClass);
        if (isNil(name)) {
            this._logger.error(
                `Missing aggregate root name for class: ${aggregateRootClass.name}. Use the @AggregateRootConfig decorator.`
            );
            throw new MissingAggregateRootNameException(aggregateRootClass.name);
        }
        return name;
    }
}
