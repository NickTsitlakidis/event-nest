import { Logger } from "@nestjs/common";
import { isNil, uniq } from "es-toolkit";

import { getEventClass, isRegistered } from "../domain-event-registrations";
import { SubscriptionException } from "../exceptions/subscription-exception";
import { UnknownEventException } from "../exceptions/unknown-event-exception";
import { UnregisteredEventException } from "../exceptions/unregistered-event-exception";
import { StoredEvent } from "../storage/stored-event";
import { AggregateRootEvent } from "./aggregate-root-event";
import { getDecoratedPropertyKey } from "./reflection";

type KnownEvent = {
    payload: unknown;
    processorKey: string;
};

export abstract class AggregateRoot {
    private readonly _logger: Logger;
    private _uncommittedEvents: Array<AggregateRootEvent<object>>;
    private _version: number;

    protected constructor(
        private readonly _id: string,
        logger?: Logger
    ) {
        this._uncommittedEvents = [];
        this._version = 0;
        this._logger = isNil(logger) ? new Logger(AggregateRoot.name) : logger;
    }

    /**
     * @deprecated Use {@link uncommittedEvents} instead. It will be removed in version 5.x
     */
    get appendedEvents(): Array<AggregateRootEvent<object>> {
        return [...this._uncommittedEvents];
    }

    get id(): string {
        return this._id;
    }

    get logger(): Logger {
        return this._logger;
    }

    /**
     * Returns a clone array of all the currently uncommitted events of the entity.
     */
    get uncommittedEvents(): Array<AggregateRootEvent<object>> {
        return [...this._uncommittedEvents];
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
     * @throws UnregisteredEventException if the event is not registered
     */
    append(event: object) {
        if (!isRegistered(event)) {
            this.logger.error(`Event ${event.constructor.name} is not registered.`);
            throw new UnregisteredEventException(event.constructor.name);
        }

        this._uncommittedEvents.push({
            aggregateRootId: this.id,
            occurredAt: new Date(Date.now()),
            payload: event
        });
    }

    /**
     * All the events that have been previously appended will be committed once this method runs. After publishing,
     * the uncommitted events will be deleted so that the next commit publishes newer events.
     * During publishing, the events will be saved and after the successful save, all the application event
     * handlers will be called to take care of async updates.
     * Call this once all the events you want, have been appended.
     */
    async commit(): Promise<this> {
        const toPublish = [...this._uncommittedEvents];
        if (toPublish.length === 0) {
            return this;
        }

        try {
            await this.publish(toPublish);
            this._uncommittedEvents = [];
            return this;
        } catch (error) {
            if (error instanceof SubscriptionException) {
                this._uncommittedEvents = [];
            }
            throw error;
        }
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
     * @throws UnknownEventException if an event is not known
     */
    reconstitute(events: Array<StoredEvent>) {
        const startedAt = Date.now();
        if (events.length > 0) {
            const [unregistered, missingProcessor, known] = this.splitEvents(this.sortEvents(events));

            if (unregistered.length > 0 || missingProcessor.length > 0) {
                const throwable = new UnknownEventException(uniq(unregistered), uniq(missingProcessor), this.id);
                this.logger.error(throwable.message);
                throw throwable;
            }

            for (const knownEvent of known) {
                try {
                    (this as any)[knownEvent.processorKey](knownEvent.payload);
                } catch (error) {
                    this.logger.error(`Unable to process domain event due to error in processor function: ${error}`);
                    throw error;
                }
            }
            this.resolveVersion(events);
        }
        const duration = Date.now() - startedAt;
        this._logger.debug(`Reconstitution of ${this.constructor.name} took ${duration}ms`);
    }

    resolveVersion(events: Array<StoredEvent>) {
        const sorted: Array<StoredEvent> = events.toSorted(
            (event1, event2) => event1.aggregateRootVersion - event2.aggregateRootVersion
        );
        const lastElement = sorted.at(-1);
        this._version = isNil(lastElement) ? 0 : lastElement.aggregateRootVersion;
    }

    protected sortEvents(events: Array<StoredEvent>): Array<StoredEvent> {
        return events.toSorted((event1, event2) => event1.aggregateRootVersion - event2.aggregateRootVersion);
    }

    private splitEvents(events: Array<StoredEvent>): [Array<string>, Array<string>, Array<KnownEvent>] {
        const known: Array<KnownEvent> = [];
        const unregistered: Array<string> = [];
        const missingProcessor: Array<string> = [];

        for (const storedEvent of events) {
            const eventClass = getEventClass(storedEvent.eventName);
            if (isNil(eventClass)) {
                unregistered.push(storedEvent.eventName);
            } else {
                const processorKey = getDecoratedPropertyKey(this, eventClass);
                if (isNil(processorKey)) {
                    missingProcessor.push(storedEvent.eventName);
                } else {
                    known.push({
                        payload: storedEvent.getPayloadAs(eventClass),
                        processorKey
                    });
                }
            }
        }

        return [unregistered, missingProcessor, known];
    }
}
