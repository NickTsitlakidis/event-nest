import {
    AbstractEventStore,
    AbstractSnapshotStore,
    AggregateClassNotSnapshotAwareException,
    AggregateRoot,
    AggregateRootClass,
    AggregateRootSnapshot,
    DomainEventEmitter,
    EventConcurrencyException,
    getAggregateRootName,
    getAggregateRootSnapshotRevision,
    MissingAggregateRootNameException,
    SnapshotRevisionMismatchException,
    StoredAggregateRoot,
    StoredEvent
} from "@event-nest/core";
import { Logger } from "@nestjs/common";
import { isNil } from "es-toolkit";
import { MongoClient, ObjectId } from "mongodb";

export class MongoEventStore extends AbstractEventStore {
    private readonly _logger: Logger;

    constructor(
        eventEmitter: DomainEventEmitter,
        snapshotStore: AbstractSnapshotStore,
        private readonly _mongoClient: MongoClient,
        private readonly _aggregatesCollectionName: string,
        private readonly _eventsCollectionName: string
    ) {
        super(eventEmitter, snapshotStore);
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

    async findWithSnapshot<T extends AggregateRoot>(
        aggregateRootClass: AggregateRootClass<T>,
        id: string
    ): Promise<{ events: Array<StoredEvent>; snapshot?: AggregateRootSnapshot<T> }> {
        const aggregateRootName = getAggregateRootName(aggregateRootClass);
        if (isNil(aggregateRootName)) {
            this._logger.error(
                `Missing aggregate root name for class: ${aggregateRootClass.name}. Use the @AggregateRootName decorator.`
            );
            throw new MissingAggregateRootNameException(aggregateRootClass.name);
        }

        const snapshotRevision = getAggregateRootSnapshotRevision(aggregateRootClass);
        if (isNil(snapshotRevision)) {
            this._logger.error(
                `Missing snapshot revision for class: ${aggregateRootClass.name}. Use the @AggregateRootConfig decorator to set the snapshotRevision.`
            );
            throw new AggregateClassNotSnapshotAwareException(aggregateRootName);
        }

        const snapshot = await this._snapshotStore.findLatestSnapshotByAggregateId(id);
        if (!snapshot) {
            return { events: await this.findByAggregateRootId(aggregateRootClass, id), snapshot: undefined };
        }

        if (snapshot.revision != snapshotRevision) {
            throw new SnapshotRevisionMismatchException(aggregateRootName);
        }

        const documents = await this._mongoClient
            .db()
            .collection(this._eventsCollectionName)
            .find({
                aggregateRootId: id,
                aggregateRootName: aggregateRootName,
                aggregateRootVersion: { $gt: snapshot.aggregateRootVersion }
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

    async purgeAggregate(id: string): Promise<void> {
        const startedAt = Date.now();
        const session = this._mongoClient.startSession();
        try {
            await session.withTransaction(async () => {
                await this._snapshotStore.deleteByAggregateId(id, session);
                await this._mongoClient
                    .db()
                    .collection(this._eventsCollectionName)
                    .deleteMany({ aggregateRootId: id }, { session });
                await this._mongoClient
                    .db()
                    .collection(this._aggregatesCollectionName)
                    .deleteOne({ _id: new ObjectId(id) }, { session });
            });
        } finally {
            await session.endSession();
        }

        const duration = Date.now() - startedAt;
        this._logger.debug(`Purging aggregate ${id} took ${duration}ms`);
    }

    async save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>> {
        const startedAt = Date.now();
        if (events.length === 0) {
            return events;
        }

        const expectedVersion = aggregate.version;
        let committedVersion = expectedVersion;
        const session = this._mongoClient.startSession();
        try {
            await session.withTransaction(async () => {
                const foundAggregateDocument = await this._mongoClient
                    .db()
                    .collection(this._aggregatesCollectionName)
                    .findOne({ _id: new ObjectId(aggregate.id) }, { session });

                let currentVersion: number;
                if (isNil(foundAggregateDocument)) {
                    this._logger.debug(`Aggregate ${aggregate.id} does not exist. Will save it`);
                    await this._mongoClient
                        .db()
                        .collection(this._aggregatesCollectionName)
                        .insertOne({ _id: new ObjectId(aggregate.id), version: 0 }, { session });
                    currentVersion = 0;
                } else {
                    currentVersion = foundAggregateDocument["version"];
                    if (expectedVersion !== currentVersion) {
                        this._logger.error(
                            `Version conflict detected for aggregate ${aggregate.id}. Expected ${expectedVersion}. Stored ${currentVersion}`
                        );
                        throw new EventConcurrencyException(aggregate.id, currentVersion, expectedVersion);
                    }
                }

                for (const [index, storedEvent] of events.entries()) {
                    storedEvent.aggregateRootVersion = currentVersion + index + 1;
                }
                const newVersion = currentVersion + events.length;

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

                await this._mongoClient.db().collection(this._eventsCollectionName).insertMany(mapped, { session });
                await this._mongoClient
                    .db()
                    .collection(this._aggregatesCollectionName)
                    .findOneAndUpdate(
                        { _id: new ObjectId(aggregate.id) },
                        { $set: { version: newVersion } },
                        { session }
                    );

                committedVersion = newVersion;
            });
        } finally {
            await session.endSession();
        }
        aggregate.version = committedVersion;
        const duration = Date.now() - startedAt;
        this._logger.debug(`Saving events for aggregate ${aggregate.id} took ${duration}ms`);
        return events;
    }
}
