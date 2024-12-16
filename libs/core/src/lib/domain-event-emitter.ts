import { Logger, OnModuleDestroy } from "@nestjs/common";
import { Module } from "@nestjs/core/injector/module";
import { concatMap, from, lastValueFrom, toArray } from "rxjs";

import {
    getEventId,
    getEventsFromDomainEventSubscription,
    getSubscriptionAsyncType,
    isDomainEventSubscription
} from "./domain-event-subscription";
import { SubscriptionException } from "./exceptions/subscription-exception";
import { OnDomainEvent } from "./on-domain-event";
import { PublishedDomainEvent } from "./published-domain-event";
import { isNil } from "./utils/type-utils";

export class DomainEventEmitter implements OnModuleDestroy {
    private readonly _asyncHandlers: Map<string, Array<OnDomainEvent<object>>>;
    private readonly _logger: Logger;
    private readonly _syncHandlers: Map<string, Array<OnDomainEvent<object>>>;

    constructor(private readonly _concurrentSubscriptions = false) {
        this._asyncHandlers = new Map<string, Array<OnDomainEvent<object>>>();
        this._syncHandlers = new Map<string, Array<OnDomainEvent<object>>>();
        this._logger = new Logger(DomainEventEmitter.name);
    }

    get concurrentSubscriptions(): boolean {
        return this._concurrentSubscriptions;
    }

    bindSubscriptions(injectorModules: Map<string, Module>) {
        injectorModules.forEach((module) => {
            module.providers.forEach((provider) => {
                if (!provider.instance || !provider.instance.constructor) {
                    return;
                }

                if (isDomainEventSubscription(provider.instance as object)) {
                    const events = getEventsFromDomainEventSubscription(provider.instance as OnDomainEvent<unknown>);
                    const isAsync = getSubscriptionAsyncType(provider.instance as OnDomainEvent<unknown>);
                    if (isAsync) {
                        events.forEach((event) => {
                            const eventId = getEventId(event) as string;
                            if (!this._asyncHandlers.has(eventId)) {
                                this._asyncHandlers.set(eventId, []);
                            }

                            this._logger.debug(`Binding ${provider.instance?.constructor.name} to event ${eventId}`);
                            this._asyncHandlers.get(eventId)?.push(provider.instance as OnDomainEvent<object>);
                        });
                    } else {
                        events.forEach((event) => {
                            const eventId = getEventId(event) as string;
                            if (!this._syncHandlers.has(eventId)) {
                                this._syncHandlers.set(eventId, []);
                            }

                            this._logger.debug(`Binding ${provider.instance?.constructor.name} to event ${eventId}`);
                            this._syncHandlers.get(eventId)?.push(provider.instance as OnDomainEvent<object>);
                        });
                    }
                }
            });
        });
    }

    emitMultiple(publishedEvents: PublishedDomainEvent<object>[]): Promise<unknown> {
        if (this._asyncHandlers.size === 0 && this._syncHandlers.size === 0) {
            this._logger.warn(
                `No event subscriptions have been discovered. Make sure you use the @DomainEventSubscription decorator`
            );
            return Promise.resolve();
        }

        return this._concurrentSubscriptions
            ? this.emitConcurrently(publishedEvents)
            : this.emitSequentially(publishedEvents);
    }

    onModuleDestroy() {
        this._asyncHandlers.clear();
        this._syncHandlers.clear();
    }

    private catchError(
        handler: OnDomainEvent<object>,
        rethrow = false
    ): (event: PublishedDomainEvent<object>) => Promise<unknown> {
        return (event: PublishedDomainEvent<object>) => {
            return handler.onDomainEvent(event).catch((error) => {
                this._logger.error(
                    `Error while emitting event ${event.payload.constructor.name} : ${(error as any).message}`
                );
                return rethrow
                    ? Promise.reject(new SubscriptionException(error, event.payload.constructor.name, event.eventId))
                    : Promise.resolve();
            });
        };
    }

    private emitConcurrently(publishedEvents: PublishedDomainEvent<object>[]): Promise<unknown> {
        const [eventsWithSyncSubscriptions, eventsWithAsyncSubscriptions] =
            this.splitEventsBySubscriptionType(publishedEvents);

        if (eventsWithAsyncSubscriptions.length > 0) {
            const promises = eventsWithAsyncSubscriptions.flatMap((event) => {
                const eventId = getEventId(event.payload.constructor) as string;
                const handlers = this._asyncHandlers.get(eventId) as Array<OnDomainEvent<object>>;
                return handlers.map((handler) => this.catchError(handler)(event));
            });

            Promise.all(promises);
        }

        if (eventsWithSyncSubscriptions.length > 0) {
            const promises = eventsWithSyncSubscriptions.flatMap((event) => {
                const eventId = getEventId(event.payload.constructor) as string;
                const handlers = this._syncHandlers.get(eventId) as Array<OnDomainEvent<object>>;
                return handlers.map((handler) => this.catchError(handler, true)(event));
            });

            return Promise.all(promises);
        }

        return Promise.resolve();
    }

    private emitSequentially(publishedEvents: PublishedDomainEvent<object>[]): Promise<unknown> {
        const [eventsWithSyncSubscriptions] = this.splitEventsBySubscriptionType(publishedEvents);

        //if there is even one event with a sync subscription, we should wait for all events to be emitted
        const shouldWait = eventsWithSyncSubscriptions.length > 0;

        const promisesPerEvent: Array<{
            event: PublishedDomainEvent<object>;
            promise: () => Promise<unknown>;
        }> = publishedEvents
            .filter((event) => {
                const eventId = getEventId(event.payload.constructor) as string;
                const hasSubscriptions = this._syncHandlers.has(eventId) || this._asyncHandlers.has(eventId);
                if (!hasSubscriptions) {
                    this._logger.warn(
                        `Event ${event.payload.constructor.name} can't be passed to subscriptions. Make sure you use the @DomainEventSubscription decorator`
                    );
                }
                return hasSubscriptions;
            })
            .map((event) => {
                const eventId = getEventId(event.payload.constructor) as string;
                const syncHandlers = this._syncHandlers.get(eventId) ?? [];
                const asyncHandlers = this._asyncHandlers.get(eventId) ?? [];
                const all = [...syncHandlers, ...asyncHandlers].map((handler) => this.catchError(handler, true));
                return {
                    event,
                    promise: () => {
                        return Promise.all(all.map((handler) => handler(event)));
                    }
                };
            });

        if (shouldWait) {
            return lastValueFrom(
                from(promisesPerEvent).pipe(
                    concatMap((perEvent) => from(perEvent.promise())),
                    toArray()
                )
            );
        } else {
            from(promisesPerEvent)
                .pipe(
                    concatMap((perEvent) => from(perEvent.promise())),
                    toArray()
                )
                .subscribe({});
            return Promise.resolve();
        }
    }

    private splitEventsBySubscriptionType(
        publishedEvents: PublishedDomainEvent<object>[]
    ): [PublishedDomainEvent<object>[], PublishedDomainEvent<object>[]] {
        const withValidMetadata = publishedEvents.filter((event) => {
            const eventId = getEventId(event.payload.constructor);
            return !isNil(eventId);
        });

        const eventsWithSyncSubscriptions = withValidMetadata.filter((event) => {
            const eventId = getEventId(event.payload.constructor) as string;
            return this._syncHandlers.has(eventId);
        });

        const eventsWithAsyncSubscriptions = withValidMetadata.filter((event) => {
            const eventId = getEventId(event.payload.constructor) as string;
            return this._asyncHandlers.has(eventId);
        });

        return [eventsWithSyncSubscriptions, eventsWithAsyncSubscriptions];
    }
}
