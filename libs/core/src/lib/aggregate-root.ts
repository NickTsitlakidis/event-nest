import { Logger } from "@nestjs/common";
import { StoredEvent } from "./storage/stored-event";
import { getDecoratedPropertyKey } from "./event-processor";
import { UnknownEventException } from "./exceptions/unknown-event-exception";
import { isNil } from "./utils/type-utils";
import { UnregisteredEventException } from "./exceptions/unregistered-event-exception";
import { AggregateRootAwareEvent } from "./aggregate-root-aware-event";
import { getEventClass, isRegistered } from "./domain-event-registrations";

type KnownEvent = {
    processorKey: string;
    payload: unknown;
};

export abstract class AggregateRoot {
    private _appendedEvents: Array<AggregateRootAwareEvent<object>>;
    private _version: number;
    private readonly _logger: Logger;

    protected constructor(private readonly _id: string, logger?: Logger) {
        this._appendedEvents = [];
        this._version = 0;
        this._logger = isNil(logger) ? new Logger(AggregateRoot.name) : logger;
    }

    get id(): string {
        return this._id;
    }

    /**
     * Defines the current version of the aggregate root. The version is increased
     * each time an event is persisted.
     */
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    publish(events: Array<AggregateRootAwareEvent<object>>): Promise<Array<StoredEvent>> {
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
        const toPublish = this._appendedEvents.slice(0);
        this._appendedEvents = [];
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
            throw new UnregisteredEventException(event.constructor.name);
        }

        this._appendedEvents.push({
            aggregateRootId: this.id,
            payload: event,
            occurredAt: new Date(Date.now())
        });
    }

    /**
     * Returns a clone array of all the currently appended events of the entity.
     */
    get appendedEvents(): Array<AggregateRootAwareEvent<object>> {
        return this._appendedEvents.slice(0);
    }

    /**
     * Used when a set of events have been retrieved from the database. These events can be passed to the method and the
     * method will trigger all the matching {@link EventProcessor} functions of the entity to populate the object based on
     * application logic.
     * @param events The events that will be sent to EventProcessor functions
     */
    reconstitute(events: Array<StoredEvent>) {
        if (events.length > 0) {
            const [unregistered, missingProcessor, known] = this.splitEvents(this.sortEvents(events));

            if (unregistered.length > 0 || missingProcessor.length > 0) {
                const e = new UnknownEventException(unregistered, missingProcessor, this.id);
                this.logger.error(e.message);
                throw e;
            }

            known.forEach((event) => {
                try {
                    (this as any)[event.processorKey](event.payload);
                } catch (error) {
                    this.logger.error(`Unable to process domain event due to error in processor function: ${error}`);
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

    private splitEvents(events: Array<StoredEvent>): [Array<string>, Array<string>, Array<KnownEvent>] {
        const known: Array<KnownEvent> = [];
        const unregistered: Array<string> = [];
        const missingProcessor: Array<string> = [];

        events.forEach((ev) => {
            const eventClass = getEventClass(ev.eventName);
            if (isNil(eventClass)) {
                unregistered.push(ev.eventName);
            } else {
                const processorKey = getDecoratedPropertyKey(this, eventClass);
                if (isNil(processorKey)) {
                    missingProcessor.push(ev.eventName);
                } else {
                    known.push({
                        processorKey,
                        payload: ev.getPayloadAs(eventClass)
                    });
                }
            }
        });

        return [unregistered, missingProcessor, known];
    }
}
