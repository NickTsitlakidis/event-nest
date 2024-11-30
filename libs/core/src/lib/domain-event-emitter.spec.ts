import { createMock } from "@golevelup/ts-jest";
import { InjectionToken } from "@nestjs/common";
import { Injectable } from "@nestjs/common/interfaces";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { Module } from "@nestjs/core/injector/module";
import { firstValueFrom, map, mergeMap, throwError, timer } from "rxjs";

import { DomainEventEmitter } from "./domain-event-emitter";
import { DomainEventSubscription } from "./domain-event-subscription";
import { OnDomainEvent } from "./on-domain-event";

class Event1 {
    constructor(public readonly test: string) {}
}

class Event2 {}

class Event3 {}

@DomainEventSubscription(Event1)
class OtherSubscription implements OnDomainEvent<Event1> {
    onDomainEvent(): Promise<unknown> {
        return Promise.resolve();
    }
}

@DomainEventSubscription(Event2)
class TestEvent2Subscription implements OnDomainEvent<Event2> {
    onDomainEvent(): Promise<unknown> {
        return Promise.resolve();
    }
}

@DomainEventSubscription(Event1)
class TestSubscription implements OnDomainEvent<Event1> {
    onDomainEvent(): Promise<unknown> {
        return Promise.resolve();
    }
}

@DomainEventSubscription(Event1, Event2)
class WithMultiple implements OnDomainEvent<Event1 | Event2> {
    onDomainEvent(): Promise<unknown> {
        return Promise.resolve();
    }
}

test("onModuleDestroy - stops calling subscriptions", () => {
    const bus = new DomainEventEmitter();

    const subscription = new TestSubscription();
    const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>();
    providersMap.set(TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription }));
    const injectorModules = new Map<string, Module>();
    injectorModules.set("test", createMock<Module>({ providers: providersMap }));

    const handleSpy = jest.spyOn(subscription, "onDomainEvent");

    const creationDate = new Date();
    bus.bindSubscriptions(injectorModules);

    bus.emit({
        aggregateRootId: "test",
        eventId: "ev-id",
        occurredAt: creationDate,
        payload: new Event1(""),
        version: 1
    });
    bus.onModuleDestroy();

    bus.emit({
        aggregateRootId: "test",
        eventId: "ev-id2",
        occurredAt: creationDate,
        payload: new Event1(""),
        version: 2
    });

    expect(handleSpy).toHaveBeenCalledTimes(1);
});

describe("emit tests", () => {
    test("emits event when binding exists", async () => {
        const subscription = new TestSubscription();
        const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>();
        providersMap.set(TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription }));
        const injectorModules = new Map<string, Module>();
        injectorModules.set("test", createMock<Module>({ providers: providersMap }));

        const handleSpy = jest.spyOn(subscription, "onDomainEvent").mockResolvedValue("anything");

        const bus = new DomainEventEmitter();
        bus.bindSubscriptions(injectorModules);

        const creationDate = new Date();
        await bus.emit({
            aggregateRootId: "test",
            eventId: "ev-id",
            occurredAt: creationDate,
            payload: new Event1("apollo"),
            version: 1
        });

        expect(handleSpy).toHaveBeenCalledTimes(1);
        expect(handleSpy).toHaveBeenCalledWith({
            aggregateRootId: "test",
            eventId: "ev-id",
            occurredAt: creationDate,
            payload: new Event1("apollo"),
            version: 1
        });
    });

    test("emits to multiple subscriptions", async () => {
        const subscription1 = new TestSubscription();
        const subscription2 = new OtherSubscription();
        const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>();
        providersMap.set(TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription1 }));
        providersMap.set(OtherSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription2 }));
        const injectorModules = new Map<string, Module>();
        injectorModules.set("test", createMock<Module>({ providers: providersMap }));

        const handleSpy = jest.spyOn(subscription1, "onDomainEvent").mockResolvedValue("anything");
        const handleSpy2 = jest.spyOn(subscription2, "onDomainEvent").mockResolvedValue("anything");

        const bus = new DomainEventEmitter();
        bus.bindSubscriptions(injectorModules);

        const creationDate = new Date();
        await bus.emit({
            aggregateRootId: "test",
            eventId: "ev-id",
            occurredAt: creationDate,
            payload: new Event1("apollo"),
            version: 1
        });

        expect(handleSpy).toHaveBeenCalledTimes(1);
        expect(handleSpy).toHaveBeenCalledWith({
            aggregateRootId: "test",
            eventId: "ev-id",
            occurredAt: creationDate,
            payload: new Event1("apollo"),
            version: 1
        });
        expect(handleSpy2).toHaveBeenCalledTimes(1);
        expect(handleSpy2).toHaveBeenCalledWith({
            aggregateRootId: "test",
            eventId: "ev-id",
            occurredAt: creationDate,
            payload: new Event1("apollo"),
            version: 1
        });
    });

    test("returns when event has no bound subscriptions", async () => {
        const subscription1 = new TestSubscription();
        const subscription2 = new OtherSubscription();
        const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>();
        providersMap.set(TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription1 }));
        providersMap.set(OtherSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription2 }));
        const injectorModules = new Map<string, Module>();
        injectorModules.set("test", createMock<Module>({ providers: providersMap }));

        const handleSpy = jest.spyOn(subscription1, "onDomainEvent").mockResolvedValue("anything");
        const handleSpy2 = jest.spyOn(subscription2, "onDomainEvent").mockResolvedValue("anything");

        const bus = new DomainEventEmitter();
        bus.bindSubscriptions(injectorModules);

        const creationDate = new Date();
        await bus.emit({
            aggregateRootId: "test",
            eventId: "ev-id",
            occurredAt: creationDate,
            payload: new Event2(),
            version: 1
        });

        expect(handleSpy).toHaveBeenCalledTimes(0);
        expect(handleSpy2).toHaveBeenCalledTimes(0);
    });
});

describe("emitMultiple tests", () => {
    test("emits to subscriptions with multiple events", async () => {
        const subscription1 = new TestSubscription();
        const subscription2 = new WithMultiple();

        const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>();
        providersMap.set(TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription1 }));
        providersMap.set(WithMultiple, createMock<InstanceWrapper<Injectable>>({ instance: subscription2 }));
        const injectorModules = new Map<string, Module>();
        injectorModules.set("test", createMock<Module>({ providers: providersMap }));

        const handleSpy = jest.spyOn(subscription1, "onDomainEvent").mockResolvedValue("anything");
        const handleSpy2 = jest.spyOn(subscription2, "onDomainEvent").mockResolvedValue("anything");

        const bus = new DomainEventEmitter();
        bus.bindSubscriptions(injectorModules);

        const creationDate1 = new Date();
        const creationDate2 = new Date();
        await bus.emitMultiple([
            {
                aggregateRootId: "test",
                eventId: "ev-id",
                occurredAt: creationDate1,
                payload: new Event1("apollo"),
                version: 1
            },
            {
                aggregateRootId: "cc",
                eventId: "ev-id2",
                occurredAt: creationDate2,
                payload: new Event2(),
                version: 2
            }
        ]);

        expect(handleSpy).toHaveBeenCalledTimes(1);
        expect(handleSpy).toHaveBeenCalledWith({
            aggregateRootId: "test",
            eventId: "ev-id",
            occurredAt: creationDate1,
            payload: new Event1("apollo"),
            version: 1
        });
        expect(handleSpy2).toHaveBeenCalledTimes(2);
        expect(handleSpy2).toHaveBeenNthCalledWith(1, {
            aggregateRootId: "test",
            eventId: "ev-id",
            occurredAt: creationDate1,
            payload: new Event1("apollo"),
            version: 1
        });
        expect(handleSpy2).toHaveBeenNthCalledWith(2, {
            aggregateRootId: "cc",
            eventId: "ev-id2",
            occurredAt: creationDate2,
            payload: new Event2(),
            version: 2
        });
    });
    test("returns when events have no bound subscriptions", async () => {
        const subscription1 = new TestSubscription();
        const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>();
        providersMap.set(TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription1 }));
        const injectorModules = new Map<string, Module>();
        injectorModules.set("test", createMock<Module>({ providers: providersMap }));

        const handleSpy = jest.spyOn(subscription1, "onDomainEvent").mockResolvedValue("anything");

        const bus = new DomainEventEmitter();
        bus.bindSubscriptions(injectorModules);

        const creationDate1 = new Date();
        const creationDate2 = new Date();
        await bus.emitMultiple([
            {
                aggregateRootId: "test",
                eventId: "ev-id2",
                occurredAt: creationDate1,
                payload: new Event2(),
                version: 1
            },
            {
                aggregateRootId: "test",
                eventId: "ev-id",
                occurredAt: creationDate2,
                payload: new Event3(),
                version: 2
            }
        ]);

        expect(handleSpy).toHaveBeenCalledTimes(0);
    });

    test("ignores events without handlers", async () => {
        const subscription1 = new TestSubscription();
        const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>();
        providersMap.set(TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription1 }));
        const injectorModules = new Map<string, Module>();
        injectorModules.set("test", createMock<Module>({ providers: providersMap }));

        const handleSpy = jest.spyOn(subscription1, "onDomainEvent").mockResolvedValue("anything");

        const bus = new DomainEventEmitter();
        bus.bindSubscriptions(injectorModules);

        const creationDate1 = new Date();
        const creationDate2 = new Date();
        await bus.emitMultiple([
            {
                aggregateRootId: "test2",
                eventId: "ev-id2",
                occurredAt: creationDate2,
                payload: new Event2(),
                version: 2
            },
            {
                aggregateRootId: "test1",
                eventId: "ev-id",
                occurredAt: creationDate1,
                payload: new Event1("ev1"),
                version: 1
            }
        ]);

        expect(handleSpy).toHaveBeenCalledTimes(1);
        expect(handleSpy).toHaveBeenCalledWith({
            aggregateRootId: "test1",
            eventId: "ev-id",
            occurredAt: creationDate1,
            payload: new Event1("ev1"),
            version: 1
        });
    });

    test("emits sequentially when flag is set", async () => {
        const subscription1 = new TestSubscription();
        const subscription2 = new TestEvent2Subscription();
        const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>();
        providersMap.set(TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription1 }));
        providersMap.set(TestEvent2Subscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription2 }));
        const injectorModules = new Map<string, Module>();
        injectorModules.set("test", createMock<Module>({ providers: providersMap }));

        const handledParameters: Array<any> = [];
        const handleSpy = jest.spyOn(subscription1, "onDomainEvent").mockImplementation(() => {
            return firstValueFrom(
                timer(500).pipe(
                    map(() => {
                        handledParameters.push(1);
                        return "anything";
                    })
                )
            );
        });
        const handleSpy2 = jest.spyOn(subscription2, "onDomainEvent").mockImplementation(() => {
            return firstValueFrom(
                timer(1000).pipe(
                    map(() => {
                        handledParameters.push(2);
                        return "anything";
                    })
                )
            );
        });

        const bus = new DomainEventEmitter(false);
        bus.bindSubscriptions(injectorModules);

        const creationDate1 = new Date();
        const creationDate2 = new Date();
        await bus.emitMultiple([
            {
                aggregateRootId: "test2",
                eventId: "ev-id2",
                occurredAt: creationDate2,
                payload: new Event2(),
                version: 2
            },
            {
                aggregateRootId: "test1",
                eventId: "ev-id",
                occurredAt: creationDate1,
                payload: new Event1("ev1"),
                version: 1
            }
        ]);

        expect(handleSpy).toHaveBeenCalledTimes(1);
        expect(handleSpy).toHaveBeenCalledWith({
            aggregateRootId: "test1",
            eventId: "ev-id",
            occurredAt: creationDate1,
            payload: new Event1("ev1"),
            version: 1
        });
        expect(handleSpy2).toHaveBeenCalledTimes(1);
        expect(handleSpy2).toHaveBeenCalledWith({
            aggregateRootId: "test2",
            eventId: "ev-id2",
            occurredAt: creationDate2,
            payload: new Event2(),
            version: 2
        });
        expect(handledParameters).toEqual([2, 1]);
    }, 10_000);

    test("stops on error when running sequentially", async () => {
        const subscription1 = new TestSubscription();
        const subscription2 = new TestEvent2Subscription();
        const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>();
        providersMap.set(TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription1 }));
        providersMap.set(TestEvent2Subscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription2 }));
        const injectorModules = new Map<string, Module>();
        injectorModules.set("test", createMock<Module>({ providers: providersMap }));

        const handledParameters: Array<any> = [];
        const handleSpy = jest.spyOn(subscription1, "onDomainEvent").mockImplementation(() => {
            return firstValueFrom(
                timer(500).pipe(
                    map(() => {
                        handledParameters.push(1);
                        return "anything";
                    })
                )
            );
        });
        const thrower = timer(1000).pipe(
            mergeMap(() => {
                return throwError(() => new Error("test"));
            })
        );

        const handleSpy2 = jest.spyOn(subscription2, "onDomainEvent").mockImplementation(() => {
            return firstValueFrom(thrower);
        });

        const bus = new DomainEventEmitter(false);
        bus.bindSubscriptions(injectorModules);

        const creationDate1 = new Date();
        const creationDate2 = new Date();

        await bus.emitMultiple([
            {
                aggregateRootId: "test2",
                eventId: "ev-id2",
                occurredAt: creationDate2,
                payload: new Event2(),
                version: 2
            },
            {
                aggregateRootId: "test1",
                eventId: "ev-id",
                occurredAt: creationDate1,
                payload: new Event1("ev1"),
                version: 1
            }
        ]);

        expect(handleSpy2).toHaveBeenCalledTimes(1);
        expect(handleSpy2).toHaveBeenCalledWith({
            aggregateRootId: "test2",
            eventId: "ev-id2",
            occurredAt: creationDate2,
            payload: new Event2(),
            version: 2
        });
        expect(handleSpy).toHaveBeenCalledTimes(0);
        expect(handledParameters).toEqual([]);
    }, 10_000);
});
