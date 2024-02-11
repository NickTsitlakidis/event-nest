import { Module } from "@nestjs/core/injector/module";
import {
    getEventId,
    getEventsFromDomainEventSubscription,
    isDomainEventSubscription
} from "./domain-event-subscription";
import { isNil } from "./utils/type-utils";
import { Logger, OnModuleDestroy } from "@nestjs/common";
import { OnDomainEvent } from "./on-domain-event";
import { concatMap, from, lastValueFrom, toArray } from "rxjs";
import { PublishedDomainEvent } from "./published-domain-event";

export class DomainEventEmitter implements OnModuleDestroy {
    private readonly _handlers: Map<string, Array<OnDomainEvent<object>>>;
    private readonly _logger: Logger;

    constructor(private readonly _concurrentSubscriptions = false) {
        this._handlers = new Map<string, Array<OnDomainEvent<object>>>();
        this._logger = new Logger(DomainEventEmitter.name);
    }

    get concurrentSubscriptions(): boolean {
        return this._concurrentSubscriptions;
    }

    onModuleDestroy() {
        this._handlers.clear();
    }

    bindSubscriptions(injectorModules: Map<string, Module>) {
        injectorModules.forEach((module) => {
            module.providers.forEach((provider) => {
                if (!provider.instance || !provider.instance.constructor) {
                    return;
                }

                if (isDomainEventSubscription(provider.instance as object)) {
                    const events = getEventsFromDomainEventSubscription(provider.instance as OnDomainEvent<unknown>);
                    events.forEach((event) => {
                        const eventId = getEventId(event) as string;
                        if (!this._handlers.has(eventId)) {
                            this._handlers.set(eventId, []);
                        }

                        this._logger.debug(`Binding ${provider.instance?.constructor.name} to event ${eventId}`);
                        this._handlers.get(eventId)?.push(provider.instance as OnDomainEvent<object>);
                    });
                }
            });
        });
    }

    emit(withAggregate: PublishedDomainEvent<object>): Promise<unknown> {
        if (this._handlers.size === 0) {
            this._logger.warn(
                `Event ${withAggregate.payload.constructor.name} can't be passed to subscriptions. Make sure you use the @DomainEventSubscription decorator`
            );
            return Promise.resolve();
        }
        const eventId = getEventId(withAggregate.payload.constructor);
        if (isNil(eventId) || !this._handlers.has(eventId)) {
            this._logger.warn(
                `Event ${withAggregate.payload.constructor.name} can't be passed to subscriptions. Make sure you use the @DomainEventSubscription decorator`
            );
            return Promise.resolve();
        }

        const handlers = this._handlers.get(eventId) as Array<OnDomainEvent<object>>;
        const withErrorHandling = handlers.map((handler) => {
            return async () => {
                // eslint-disable-next-line no-useless-catch
                try {
                    const result = await handler.onDomainEvent(withAggregate);
                    return result;
                } catch (error) {
                    this._logger.error(
                        `Error while emitting event ${withAggregate.payload.constructor.name} : ${
                            (error as any).message
                        }`
                    );
                    throw error;
                }
            };
        });
        return Promise.all(withErrorHandling.map((f) => f()));
    }

    emitMultiple(withAggregate: PublishedDomainEvent<object>[]): Promise<unknown> {
        if (this._concurrentSubscriptions) {
            return Promise.all(withAggregate.map((aggregate) => this.emit(aggregate)));
        }

        return lastValueFrom(
            from(withAggregate).pipe(
                concatMap((event) => from(this.emit(event))),
                toArray()
            )
        ).catch((error) => {
            this._logger.debug(`Error while emitting events sequentially: ${(error as any).message}`);
        });
    }
}
