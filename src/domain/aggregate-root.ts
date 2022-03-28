import { EventPayload } from "../storage/event-payload";
import { Logger } from "@nestjs/common";
import { SourceEvent } from "../storage/source-event";
import { getEventClassForName } from "../decorators/serialized-event";
import { MissingEventHandlerException } from "../exceptions/missing-event-handler-exception";
import { getProcessFunctionKey, ProcessEvent } from "../decorators/process-event";
import { EventNameConflictException } from "../exceptions/event-name-conflict-exception";

export abstract class AggregateRoot {
    private _appliedEvents: Array<EventPayload>;
    private _version: number;

    protected constructor(
        private readonly _id: string,
        events: Array<SourceEvent> = [],
        private readonly _logger?: Logger
    ) {
        this._appliedEvents = [];
        this._version = 0;

        if (events && events.length > 0) {
            this.buildFromEvents(events);
        }

        if (!this._logger) {
            this._logger = new Logger(AggregateRoot.name);
        }
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
    publish(events: Array<EventPayload>): Promise<Array<SourceEvent>> {
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
    buildFromEvents(events: Array<SourceEvent>) {
        if (events.length > 0) {
            this.sortEvents(events).forEach((ev) => {
                try {
                    const eventClass = getEventClassForName(ev.eventName);
                    if (!eventClass) {
                        this.logger.error(`Found event name with no handler : ${ev.eventName}.`);
                        throw new MissingEventHandlerException(ev.eventName, this._id);
                    }
                    const processorKey = getProcessFunctionKey(this, eventClass);
                    if (!processorKey) {
                        this.logger.error(`Found event name with no handler : ${ev.eventName}.`);
                        throw new MissingEventHandlerException(ev.eventName, this._id);
                    }
                    const mappedEvent = ev.getPayloadAs(eventClass);
                    this[processorKey](mappedEvent);
                } catch (error) {
                    this.logger.error(`Unable to process domain event : ${ev.eventName}.`);
                    throw error;
                }
            });

            this.resolveVersion(events);
        }
    }

    protected resolveVersion(events: Array<SourceEvent>) {
        const sorted: Array<SourceEvent> = events.sort((e1, e2) => e1.aggregateRootVersion - e2.aggregateRootVersion);
        this._version = sorted.slice(-1)[0].aggregateRootVersion;
    }

    protected sortEvents(events: Array<SourceEvent>): Array<SourceEvent> {
        return events.sort((e1, e2) => e1.aggregateRootVersion - e2.aggregateRootVersion);
    }
}
