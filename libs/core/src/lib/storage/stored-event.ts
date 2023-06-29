import { ClassConstructor, instanceToPlain, plainToClass } from "class-transformer";
import { EventPayload } from "./event-payload";
import { getEventName } from "../decorators/registered-event";
import { isNil } from "../utils/type-utils";

export class StoredEvent {
    aggregateRootVersion!: number;

    private readonly _id: string;
    private readonly _aggregateRootId: string;
    private _createdAt!: Date;
    private _payload: unknown;
    private _eventName!: string;

    private constructor(id: string, aggregateRootId: string) {
        this._aggregateRootId = aggregateRootId;
        this._id = id;
    }

    static fromPublishedEvent(id: string, aggregateRootId: string, publishedEvent: EventPayload): StoredEvent {
        const newEvent = new StoredEvent(id, aggregateRootId);
        newEvent._createdAt = new Date(new Date().toUTCString());

        const eventName = getEventName(publishedEvent);
        if (!isNil(eventName)) {
            newEvent._payload = instanceToPlain(publishedEvent);
            newEvent._eventName = eventName;
        }
        return newEvent;
    }

    static fromStorage(
        id: string,
        aggregateRootId: string,
        eventName: string,
        createdAt: Date,
        aggregateRootVersion: number,
        payload: unknown
    ): StoredEvent {
        const newEvent = new StoredEvent(id, aggregateRootId);
        newEvent._eventName = eventName;
        newEvent._createdAt = createdAt;
        newEvent.aggregateRootVersion = aggregateRootVersion;
        newEvent._payload = payload;
        return newEvent;
    }

    public getPayloadAs<T>(payloadClass: ClassConstructor<T>): T {
        return plainToClass(payloadClass, this._payload);
    }

    get payload(): unknown {
        return this._payload;
    }

    get id(): string {
        return this._id;
    }

    get aggregateRootId(): string {
        return this._aggregateRootId;
    }

    get createdAt(): Date {
        return this._createdAt;
    }

    get eventName(): string {
        return this._eventName;
    }
}
