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
import { MongoClient, ObjectId } from "mongodb";

export class MongoEventStore extends AbstractEventStore {
    private readonly _logger: Logger;

    constructor(
        eventEmitter: DomainEventEmitter,
        private readonly _mongoClient: MongoClient,
        private readonly _aggregatesCollectionName: string,
        private readonly _eventsCollectionName: string
    ) {
        super(eventEmitter);
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
        if (documents.length > 0) {
            return documents.map((doc) => {
                return StoredEvent.fromStorage(
                    doc._id.toHexString(),
                    doc["aggregateRootId"],
                    doc["eventName"],
                    doc["createdAt"],
                    doc["aggregateRootVersion"],
                    doc["aggregateRootName"],
                    doc["payload"]
                );
            });
        }

        return [];
    }

    generateEntityId(): Promise<string> {
        return Promise.resolve(new ObjectId().toHexString());
    }

    async save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>> {
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

            const mapped = events.map((ev) => {
                return {
                    _id: new ObjectId(ev.id),
                    aggregateRootId: ev.aggregateRootId,
                    aggregateRootName: ev.aggregateRootName,
                    aggregateRootVersion: ev.aggregateRootVersion,
                    createdAt: ev.createdAt,
                    eventName: ev.eventName,
                    payload: ev.payload
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
        return events;
    }
}
