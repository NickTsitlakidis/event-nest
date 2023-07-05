import { ClassConstructor, instanceToPlain, plainToClass } from "class-transformer";
import { getEventName } from "../registered-event";
import { isNil } from "../utils/type-utils";

/**
 * Represents an event that will be persisted according to the storage solution that is used.
 * The event is defined by metadata like aggregate root id, version and creation date, and it also includes its payload
 * which can be any object based on the use case. Payload serialization is done using class-transformer
 * (https://github.com/typestack/class-transformer) so the payload needs to follow the rules defined by that library.
 *
 * The class constructor is marked as private to force the use of the static factory methods which are implemented based
 * on the use case to create the event.
 *
 */
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

    /**
     * Factory method that will create a new event based on the provided info. Typically, it should be used when
     * creating a new event that will be persisted. In this case, the payload is serialized to a plain object using the
     * class-transformer library.
     * @param id The event id
     * @param aggregateRootId The aggregate root id
     * @param payload The event payload as an object.
     */
    static fromPublishedEvent(id: string, aggregateRootId: string, payload: object): StoredEvent {
        const newEvent = new StoredEvent(id, aggregateRootId);
        newEvent._createdAt = new Date(new Date().toUTCString());

        const eventName = getEventName(payload);
        if (!isNil(eventName)) {
            newEvent._payload = instanceToPlain(payload);
            newEvent._eventName = eventName;
        }
        return newEvent;
    }

    /**
     * Factory method that will create a new event based on the provided info. Typically, it should be used when creating
     * an event that is already persisted, and we want to create a new instance of it to pass it to an aggregate root.
     * In this case the payload is not mapped to a class instance. {@link getPayloadAs} should be later used for this
     * kind of mapping.
     *
     * @param id The event id
     * @param aggregateRootId The aggregate root id
     * @param eventName The event name
     * @param createdAt The event creation date
     * @param aggregateRootVersion The aggregate root version
     * @param payload The event payload as an object.
     */
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
