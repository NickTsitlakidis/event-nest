import { EventPayload } from "../storage/event-payload";
import { Logger } from "@nestjs/common";
import { StoredEvent } from "../storage/stored-event";
import { getEventClass } from "../decorators/registered-event";
import { getProcessFunctionKey } from "../decorators/event-processor";
import { MissingEventProcessor } from "./missing-event-processor-exception";
import { isNil } from "../utils/type-utils";

export abstract class AggregateRoot {
    private _appliedEvents: Array<EventPayload>;
    private _version: number;
    private readonly _logger: Logger;

    protected constructor(private readonly _id: string, events: Array<StoredEvent> = [], logger?: Logger) {
        this._appliedEvents = [];
        this._version = 0;

        if (events && events.length > 0) {
            this.processEvents(events);
        }

        this._logger = isNil(logger) ? new Logger(AggregateRoot.name) : logger;
    }

    get id(): string {
        return this._id;
    }

    get version(): number {
        return this._version;
    }

    get logger(): Logger {
        return this._logger;
    }

    /**
     * Publishes all the provided events using a connected event publisher. To connect a publisher, use the
     * EventStoreConnector. Normally this should never be called by application logic once the connector is used.
     * If a publisher is not connected, the method will return a rejected promise.
     * @param events The events to be published
     */
    publish(events: Array<EventPayload>): Promise<Array<StoredEvent>> {
        this.logger.error("There is no event publisher assigned");
        return Promise.reject("There is no event publisher assigned");
    }

    /**
     * All the events that have been previously applied will be committed once this method runs. The commit phase has the
     * effect of publishing all the events. After publishing, the applied events will be deleted so that the next commit
     * publishes newer events.
     * During publishing, the events will be saved to Mongo and after the successful save, all the application event
     * handlers will be called to take care of async updates.
     * Call this once all the events you want, have been applied.
     */
    commit(): Promise<AggregateRoot> {
        const toPublish = this._appliedEvents.slice(0);
        this._appliedEvents = [];
        if (toPublish.length > 0) {
            return this.publish(toPublish).then(() => Promise.resolve(this));
        }
        return Promise.resolve(this);
    }

    /**
     * Adds an event to the currently applied events of the entity. This will not publish the event. Use the commit
     * method once all the events you want are appliec.
     * @param event The event to be applied
     */
    apply(event: EventPayload) {
        event.aggregateRootId = this.id;
        this._appliedEvents.push(event);
    }

    /**
     * Returns a clone array of all the currently applied events of the entity.
     */
    get appliedEvents(): Array<EventPayload> {
        return this._appliedEvents.slice(0);
    }

    /**
     * Used when a set of events have been retrieved from the database. These events can be passed to the method and the
     * method will trigger all the matching EventProcessor functions of the entity to populate the object based on
     * application logic.
     * @param events The events that will be sent to EventProcessors
     */
    processEvents(events: Array<StoredEvent>) {
        if (events.length > 0) {
            this.sortEvents(events).forEach((ev) => {
                try {
                    const eventClass = getEventClass(ev.eventName);
                    if (!eventClass) {
                        this.logger.error(`Found event name with no handler : ${ev.eventName}.`);
                        throw new MissingEventProcessor(ev.eventName, this._id);
                    }
                    const processorKey = getProcessFunctionKey(this, eventClass);
                    if (!processorKey) {
                        this.logger.error(`Found event name with no handler : ${ev.eventName}.`);
                        throw new MissingEventProcessor(ev.eventName, this._id);
                    }
                    const mappedEvent = ev.getPayloadAs(eventClass);
                    (this as any)[processorKey](mappedEvent);
                } catch (error) {
                    this.logger.error(`Unable to process domain event : ${ev.eventName}.`);
                    throw error;
                }
            });

            this.resolveVersion(events);
        }
    }

    protected resolveVersion(events: Array<StoredEvent>) {
        const sorted: Array<StoredEvent> = events.sort((e1, e2) => e1.aggregateRootVersion - e2.aggregateRootVersion);
        this._version = sorted.slice(-1)[0].aggregateRootVersion;
    }

    protected sortEvents(events: Array<StoredEvent>): Array<StoredEvent> {
        return events.sort((e1, e2) => e1.aggregateRootVersion - e2.aggregateRootVersion);
    }
}
