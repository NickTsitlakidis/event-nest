import { getEventNameForObject, hasEventName } from "../decorators/serialized-event";
import { ClassConstructor, instanceToPlain, plainToClass } from "class-transformer";
import { EventPayload } from "./event-payload";

export class StoredEvent {
    id: string;
    aggregateRootId: string;
    eventName: string;
    createdAt: Date;
    payload: unknown;
    aggregateRootVersion: number;

    constructor(eventId: string, aggregateRootId: string, serializableEvent?: EventPayload) {
        this.aggregateRootId = aggregateRootId;
        this.id = eventId;
        this.createdAt = new Date(new Date().toUTCString());
        if (serializableEvent && hasEventName(serializableEvent)) {
            this.payload = instanceToPlain(serializableEvent);
            this.eventName = getEventNameForObject(serializableEvent);
        }
    }

    public getPayloadAs<T>(payloadClass: ClassConstructor<T>): T {
        return plainToClass(payloadClass, this.payload);
    }
}
