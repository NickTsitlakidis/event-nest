import { AbstractEventStore } from "./abstract-event-store";
import { StoredEvent } from "./stored-event";
import { StoredAggregateRoot } from "./stored-aggregate-root";
import { Collection, MongoClient, ObjectID } from "mongodb";
import { Logger } from "@nestjs/common";
import { EventConcurrencyException } from "../exceptions/event-concurrency-exception";

export class MongoEventStore extends AbstractEventStore {
    private _mongoClient: MongoClient;
    private _logger: Logger;
    private _eventsCollection: Collection;
    private _aggregatesCollection: Collection;

    constructor() {
        super();
        this._logger = new Logger(MongoEventStore.name);
    }

    async findByAggregateRootId(id: string): Promise<Array<StoredEvent>> {
        const documents = await this._eventsCollection.find({ aggregateRootId: id }).toArray();
        if (documents.length > 0) {
            return documents.map((doc) => {
                const mapped = new StoredEvent(doc._id.toHexString(), doc.aggregateRootId);
                mapped.eventName = doc.eventName;
                mapped.aggregateRootVersion = doc.aggregateRootVersion;
                mapped.createdAt = doc.createdAt;
                mapped.payload = doc.payload;
                return mapped;
            });
        }

        return [];
    }

    generateEntityId(): Promise<string> {
        return Promise.resolve(new ObjectID().toHexString());
    }

    async save(events: Array<StoredEvent>, aggregate: StoredAggregateRoot): Promise<Array<StoredEvent>> {
        if (events.length === 0) {
            return events;
        }

        let incrementedVersion = 0;
        let finalAggregate: StoredAggregateRoot;

        let foundAggregate = await this._aggregatesCollection.findOne({
            _id: new ObjectID(aggregate.id)
        });

        const session = this._mongoClient.startSession();
        await session.withTransaction(async () => {
            if (!foundAggregate) {
                aggregate.version = 0;
                this._logger.debug(`Aggregate ${aggregate.id} does not exist. Will save it`);
                const mapped = { _id: new ObjectID(aggregate.id), version: aggregate.version };
                await this._aggregatesCollection.insertOne(mapped);
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
                    _id: new ObjectID(ev.id),
                    createdAt: ev.createdAt,
                    aggregateRootId: ev.aggregateRootId,
                    aggregateRootVersion: ev.aggregateRootVersion,
                    eventName: ev.eventName,
                    payload: ev.payload
                };
            });
            await this._eventsCollection.insertMany(mapped);
            await this._aggregatesCollection.findOneAndUpdate(
                {
                    _id: new ObjectID(finalAggregate.id)
                },
                {
                    $set: { version: finalAggregate.version }
                }
            );
        });
    }
}
