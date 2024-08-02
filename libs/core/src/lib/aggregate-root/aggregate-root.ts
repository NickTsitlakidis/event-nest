import { Logger } from "@nestjs/common";

import { getEventClass, isRegistered } from "../domain-event-registrations";
import { UnknownEventException } from "../exceptions/unknown-event-exception";
import { UnregisteredEventException } from "../exceptions/unregistered-event-exception";
import { StoredEvent } from "../storage/stored-event";
import { isNil } from "../utils/type-utils";
import { AggregateRootEvent } from "./aggregate-root-event";
import { getDecoratedPropertyKey } from "./reflection";

type KnownEvent = {
    payload: unknown;
    processorKey: string;
};

export abstract class AggregateRoot {
    private _appendedEvents: Array<AggregateRootEvent<object>>;
    private readonly _logger: Logger;
    private _version: number;

    protected constructor(
        private readonly _id: string,
        logger?: Logger
    ) {
        this._appendedEvents = [];
        this._version = 0;
        this._logger = isNil(logger) ? new Logger(AggregateRoot.name) : logger;
    }

    /**
     * Returns a clone array of all the currently appended events of the entity.
     */
    get appendedEvents(): Array<AggregateRootEvent<object>> {
        return this._appendedEvents.slice(0);
    }

    get id(): string {
        return this._id;
    }

    get logger(): Logger {
        return this._logger;
    }

    /**
     * Defines the current version of the aggregate root. The version is increased
     * each time an event is persisted.
     */
    get version(): number {
        return this._version;
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
            occurredAt: new Date(Date.now()),
            payload: event
        });
    }

    /**
     * All the events that have been previously appended will be committed once this method runs. After publishing,
     * the appended events will be deleted so that the next commit publishes newer events.
     * During publishing, the events will be saved and after the successful save, all the application event
     * handlers will be called to take care of async updates.
     * Call this once all the events you want, have been appended.
     */
    async commit(): Promise<AggregateRoot> {
        const toPublish = this._appendedEvents.slice(0);
        if (toPublish.length > 0) {
            await this.publish(toPublish);
            this._appendedEvents = [];
            return this;
        }
        return this;
    }

    /**
     * Publishes all the provided events using a connected event publisher. To connect a publisher, use the
     * {@link EventStore}. Normally this should never be called by application logic. Instead, after you append the
     * events, you should call the commit method which will end up calling this method.
     *
     * If a publisher is not connected, the method will return a rejected promise.
     * @param events The events to be published
     */
    publish(events: Array<AggregateRootEvent<object>>): Promise<Array<StoredEvent>> {
        this.logger.error("There is no event publisher assigned");
        return Promise.reject("There is no event publisher assigned");
    }

    /**
     * Used when a set of events have been retrieved from the database. These events can be passed to the method and the
     * method will trigger all the matching {@link ApplyEvent} functions of the entity to populate the object based on
     * application logic.
     * @param events The events that will be sent to {@link ApplyEvent} functions
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

    resolveVersion(events: Array<StoredEvent>) {
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
                        payload: ev.getPayloadAs(eventClass),
                        processorKey
                    });
                }
            }
        });

        return [unregistered, missingProcessor, known];
    }
}
