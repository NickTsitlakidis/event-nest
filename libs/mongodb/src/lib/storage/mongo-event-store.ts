import {
    AbstractEventStore,
    AggregateRoot,
    AggregateRootClass,
    AggregateRootSnapshot,
    DomainEventEmitter,
    EventConcurrencyException,
    getAggregateRootName,
    MissingAggregateRootNameException,
    NoSnapshotFoundException,
    SnapshotAwareAggregateClass,
    SnapshotRevisionMismatchException,
    StoredAggregateRoot,
    StoredEvent
} from "@event-nest/core";
import { Logger } from "@nestjs/common";
import { isNil } from "es-toolkit";
import { MongoClient, ObjectId } from "mongodb";

import { MongoSnapshotStore } from "./mongo-snapshot-store";

export class MongoEventStore extends AbstractEventStore {
    private readonly _logger: Logger;
    constructor(
        eventEmitter: DomainEventEmitter,
        mongoSnapshotStore: MongoSnapshotStore,
        private readonly _mongoClient: MongoClient,
        private readonly _aggregatesCollectionName: string,
        private readonly _eventsCollectionName: string
    ) {
        super(eventEmitter, mongoSnapshotStore);
        this._logger = new Logger(MongoEventStore.name);
    }

    get aggregatesCollectionName(): string {
        return this._aggregatesCollectionName;
    }

    get eventsCollectionName(): string {
        return this._eventsCollectionName;
    }

    async findAggregateRootVersion(id: string): Promise<number> {
        const found = await this._mongoClient
            .db()
            .collection(this._aggregatesCollectionName)
            .findOne({ _id: new ObjectId(id) });

        if (isNil(found) || isNil(found["version"])) {
            return -1;
        }

        return found["version"];
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

        const documents = await this._mongoClient
            .db()
            .collection(this._eventsCollectionName)
            .find({ aggregateRootId: id, aggregateRootName: aggregateRootName })
            .toArray();
        const duration = Date.now() - startedAt;
        this._logger.debug(`Finding events for aggregate ${id} took ${duration}ms`);
        if (documents.length > 0) {
            return documents.map((document) => {
                return StoredEvent.fromStorage(
                    document._id.toHexString(),
                    document["aggregateRootId"],
                    document["eventName"],
                    document["createdAt"],
                    document["aggregateRootVersion"],
                    document["aggregateRootName"],
                    document["payload"]
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

        const documents = await this._mongoClient
            .db()
            .collection(this._eventsCollectionName)
            .find({ aggregateRootId: { $in: ids }, aggregateRootName: aggregateRootName })
            .toArray();

        const grouped: Record<string, Array<StoredEvent>> = {};

        for (const document of documents) {
            if (isNil(grouped[document["aggregateRootId"]])) {
                grouped[document["aggregateRootId"]] = [];
            }
            grouped[document["aggregateRootId"]].push(
                StoredEvent.fromStorage(
                    document._id.toHexString(),
                    document["aggregateRootId"],
                    document["eventName"],
                    document["createdAt"],
                    document["aggregateRootVersion"],
                    document["aggregateRootName"],
                    document["payload"]
                )
            );
        }

        return grouped;
    }

    override async findWithSnapshot<T extends AggregateRoot>(
        aggregateRootClass: SnapshotAwareAggregateClass<T>,
        id: string
    ): Promise<{ events: Array<StoredEvent>; snapshot: AggregateRootSnapshot<T> }> {
        const aggregateRootName = getAggregateRootName(aggregateRootClass);
        if (isNil(aggregateRootName)) {
            this._logger.error(
                `Missing aggregate root name for class: ${aggregateRootClass.name}. Use the @AggregateRootName decorator.`
            );
            throw new MissingAggregateRootNameException(aggregateRootClass.name);
        }

        const snapshot = await this._snapshotStore.findLatestSnapshotByAggregateId(id);
        if (!snapshot) {
            throw new NoSnapshotFoundException(aggregateRootName);
        }

        if (snapshot.revision != aggregateRootClass.snapshotRevision) {
            throw new SnapshotRevisionMismatchException(aggregateRootName);
        }

        const documents = await this._mongoClient
            .db()
            .collection(this._eventsCollectionName)
            .find({
                aggregateRootId: id,
                aggregateRootName: aggregateRootName,
                aggregateRootVersion: { $gte: snapshot.aggregateRootVersion }
            })
            .toArray();

        const events = documents.map((document) => {
            return StoredEvent.fromStorage(
                document._id.toHexString(),
                document["aggregateRootId"],
                document["eventName"],
                document["createdAt"],
                document["aggregateRootVersion"],
                document["aggregateRootName"],
                document["payload"]
            );
        });

        return {
            events,
            snapshot: snapshot.payload as AggregateRootSnapshot<T>
        };
    }

    generateEntityId(): Promise<string> {
        return Promise.resolve(new ObjectId().toHexString());
    }

    async save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>> {
        const startedAt = Date.now();
        if (events.length === 0) {
            return events;
        }

        let incrementedVersion = 0;
        let finalAggregate: StoredAggregateRoot;

        const foundAggregateDocument = await this._mongoClient
            .db()
            .collection(this._aggregatesCollectionName)
            .findOne({
                _id: new ObjectId(aggregate.id)
            });

        let foundAggregate = isNil(foundAggregateDocument)
            ? undefined
            : new StoredAggregateRoot(foundAggregateDocument._id.toHexString(), foundAggregateDocument["version"]);

        const session = this._mongoClient.startSession();
        await session.withTransaction(async () => {
            if (isNil(foundAggregate)) {
                aggregate.version = 0;
                this._logger.debug(`Aggregate ${aggregate.id} does not exist. Will save it`);
                const mapped = { _id: new ObjectId(aggregate.id), version: aggregate.version };
                await this._mongoClient.db().collection(this._aggregatesCollectionName).insertOne(mapped);
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

            const mapped = events.map((event) => {
                return {
                    _id: new ObjectId(event.id),
                    aggregateRootId: event.aggregateRootId,
                    aggregateRootName: event.aggregateRootName,
                    aggregateRootVersion: event.aggregateRootVersion,
                    createdAt: event.createdAt,
                    eventName: event.eventName,
                    payload: event.payload
                };
            });
            await this._mongoClient.db().collection(this._eventsCollectionName).insertMany(mapped);
            await this._mongoClient
                .db()
                .collection(this._aggregatesCollectionName)
                .findOneAndUpdate(
                    {
                        _id: new ObjectId(finalAggregate.id)
                    },
                    {
                        $set: { version: finalAggregate.version }
                    }
                );
        });
        const duration = Date.now() - startedAt;
        this._logger.debug(`Saving events for aggregate ${aggregate.id} took ${duration}ms`);
        return events;
    }
}
