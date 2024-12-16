import { Logger, OnModuleDestroy } from "@nestjs/common";
import { Module } from "@nestjs/core/injector/module";
import { concatMap, from, lastValueFrom, toArray } from "rxjs";

import {
    getEventId,
    getEventsFromDomainEventSubscription,
    getSubscriptionAsyncType,
    isDomainEventSubscription
} from "./domain-event-subscription";
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

    emit(publishedEvent: PublishedDomainEvent<object>): Promise<unknown> {
        if (this._asyncHandlers.size === 0 || this._syncHandlers.size === 0) {
            this._logger.warn(
                `Event ${publishedEvent.payload.constructor.name} can't be passed to subscriptions. Make sure you use the @DomainEventSubscription decorator`
            );
            return Promise.resolve();
        }
        const eventId = getEventId(publishedEvent.payload.constructor);
        if (isNil(eventId) || !this._asyncHandlers.has(eventId) || !this._syncHandlers.has(eventId)) {
            this._logger.warn(
                `Event ${publishedEvent.payload.constructor.name} can't be passed to subscriptions. Make sure you use the @DomainEventSubscription decorator`
            );
            return Promise.resolve();
        }

        const toWait: Array<OnDomainEvent<object>> = this._syncHandlers.has(eventId)
            ? (this._syncHandlers.get(eventId) as Array<OnDomainEvent<object>>)
            : [];

        const notToWait: Array<OnDomainEvent<object>> = this._asyncHandlers.has(eventId)
            ? (this._asyncHandlers.get(eventId) as Array<OnDomainEvent<object>>)
            : [];

        const promisesToWait = toWait.map((handler) => {
            return async () => {
                try {
                    return await handler.onDomainEvent(publishedEvent);
                } catch (error) {
                    this._logger.error(
                        `Error while emitting event ${publishedEvent.payload.constructor.name} : ${
                            (error as any).message
                        }`
                    );
                    throw error;
                }
            };
        });
        const promisesNotToWait = notToWait.map((handler) => {
            return async () => {
                try {
                    return await handler.onDomainEvent(publishedEvent);
                } catch (error) {
                    this._logger.error(
                        `Error while emitting event ${publishedEvent.payload.constructor.name} : ${
                            (error as any).message
                        }`
                    );
                    throw error;
                }
            };
        });
        Promise.all(promisesNotToWait.map((f) => f()));

        return Promise.all(promisesToWait.map((f) => f()));
    }

    emitMultiple(publishedEvents: PublishedDomainEvent<object>[]): Promise<unknown> {
        if (this._concurrentSubscriptions) {
            return Promise.all(publishedEvents.map((publishedEvent) => this.emit(publishedEvent)));
        }

        return lastValueFrom(
            from(publishedEvents).pipe(
                concatMap((event) => from(this.emit(event))),
                toArray()
            )
        ).catch((error) => {
            this._logger.debug(`Error while emitting events sequentially: ${(error as any).message}`);
        });
    }

    onModuleDestroy() {
        this._asyncHandlers.clear();
        this._syncHandlers.clear();
    }
}
