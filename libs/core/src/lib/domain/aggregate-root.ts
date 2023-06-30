import { Logger } from "@nestjs/common";
import { StoredEvent } from "../storage/stored-event";
import { getEventClass, isRegistered } from "../decorators/registered-event";
import { getProcessFunctionKey } from "../decorators/event-processor";
import { MissingEventProcessor } from "./missing-event-processor-exception";
import { isNil } from "../utils/type-utils";
import { NotRegisteredEventException } from "../decorators/not-registered-event-exception";
import { AggregateRootAware } from "./aggregate-root-aware";

export abstract class AggregateRoot {
    private _appliedEvents: Array<AggregateRootAware<object>>;
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
     * {@link EventStore}. Normally this should never be called by application logic. Instead, after you append the
     * events, you should call the commit method which will end up calling this method.
     *
     * If a publisher is not connected, the method will return a rejected promise.
     * @param events The events to be published
     */
    publish(events: Array<AggregateRootAware<object>>): Promise<Array<StoredEvent>> {
        this.logger.error("There is no event publisher assigned");
        return Promise.reject("There is no event publisher assigned");
    }

    /**
     * All the events that have been previously appended will be committed once this method runs. After publishing,
     * the appended events will be deleted so that the next commit publishes newer events.
     * During publishing, the events will be saved and after the successful save, all the application event
     * handlers will be called to take care of async updates.
     * Call this once all the events you want, have been appended.
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
     * Adds an event to the currently existing events of the entity. This will not publish the event. Use the {@link commit}
     * method once all the events you want are appended.
     * @param event The event to be appended
     */
    append(event: object) {
        if (!isRegistered(event)) {
            this.logger.error(`Event ${event.constructor.name} is not registered.`);
            throw new NotRegisteredEventException(event.constructor.name);
        }

        this._appliedEvents.push({
            aggregateRootId: this.id,
            payload: event
        });
    }

    /**
     * Returns a clone array of all the currently appended events of the entity.
     */
    get appendedEvents(): Array<AggregateRootAware<object>> {
        return this._appliedEvents.slice(0);
    }

    /**
     * Used when a set of events have been retrieved from the database. These events can be passed to the method and the
     * method will trigger all the matching {@link EventProcessor} functions of the entity to populate the object based on
     * application logic.
     * @param events The events that will be sent to EventProcessor functions
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
