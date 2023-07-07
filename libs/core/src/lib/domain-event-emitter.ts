import { Module } from "@nestjs/core/injector/module";
import {
    getEventId,
    getEventsFromDomainEventSubscription,
    isDomainEventSubscription
} from "./domain-event-subscription";
import { AggregateRootAwareEvent } from "./aggregate-root-aware-event";
import { isNil } from "./utils/type-utils";
import { Logger, OnModuleDestroy } from "@nestjs/common";
import { OnDomainEvent } from "./on-domain-event";
import { concat, defer, firstValueFrom, from, last } from "rxjs";

export class DomainEventEmitter implements OnModuleDestroy {
    private _handlers: Map<string, Array<OnDomainEvent<object>>>;
    private _logger: Logger;

    constructor(private _runParallelSubscriptions: boolean = false) {
        this._handlers = new Map<string, Array<OnDomainEvent<object>>>();
        this._logger = new Logger(DomainEventEmitter.name);
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
                        this._handlers.get(eventId)!.push(provider.instance as OnDomainEvent<any>);
                    });
                }
            });
        });
    }

    emit(withAggregate: AggregateRootAwareEvent<object>): Promise<unknown> {
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

        const promises = this._handlers.get(eventId)!.map((handler) => handler.onDomainEvent(withAggregate));
        return Promise.all(promises);
    }

    emitMultiple(withAggregate: AggregateRootAwareEvent<object>[]): Promise<unknown> {
        if (!this._runParallelSubscriptions) {
            return Promise.all(withAggregate.map((aggregate) => this.emit(aggregate)));
        }

        const deferred = withAggregate.map((w) => defer(() => from(this.emit(w))));
        return firstValueFrom(concat(...deferred).pipe(last()));
    }
}
