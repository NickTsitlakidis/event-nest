import { DomainEventEmitter } from "./domain-event-emitter";
import { OnDomainEvent } from "./on-domain-event";
import { createMock } from "@golevelup/ts-jest";
import { Module } from "@nestjs/core/injector/module";
import { DomainEventSubscription } from "./domain-event-subscription";
import { AggregateRootAwareEvent } from "./aggregate-root-aware-event";
import { InjectionToken } from "@nestjs/common";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { Injectable } from "@nestjs/common/interfaces";
import { firstValueFrom, map, mergeMap, throwError, timer } from "rxjs";

class TestEvent1 {
    constructor(public readonly test: string) {}
}

class TestEvent2 {}

class TestEvent3 {}

@DomainEventSubscription(TestEvent1)
class TestSubscription implements OnDomainEvent<TestEvent1> {
    onDomainEvent(event: AggregateRootAwareEvent<TestEvent1>): Promise<unknown> {
        return Promise.resolve(undefined);
    }
}

@DomainEventSubscription(TestEvent1)
class OtherSubscription implements OnDomainEvent<TestEvent1> {
    onDomainEvent(event: AggregateRootAwareEvent<TestEvent1>): Promise<unknown> {
        return Promise.resolve(undefined);
    }
}

@DomainEventSubscription(TestEvent2)
class TestEvent2Subscription implements OnDomainEvent<TestEvent2> {
    onDomainEvent(event: AggregateRootAwareEvent<TestEvent2>): Promise<unknown> {
        return Promise.resolve(undefined);
    }
}

@DomainEventSubscription(TestEvent1, TestEvent2)
class WithMultiple implements OnDomainEvent<TestEvent1 | TestEvent2> {
    onDomainEvent(event: AggregateRootAwareEvent<TestEvent1 | TestEvent2>): Promise<unknown> {
        return Promise.resolve(undefined);
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

    bus.bindSubscriptions(injectorModules);

    bus.emit({ payload: new TestEvent1(""), aggregateRootId: "test" });
    bus.onModuleDestroy();

    bus.emit({ payload: new TestEvent1(""), aggregateRootId: "test" });

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

        await bus.emit({ payload: new TestEvent1("apollo"), aggregateRootId: "test" });

        expect(handleSpy).toHaveBeenCalledTimes(1);
        expect(handleSpy).toHaveBeenCalledWith({ payload: new TestEvent1("apollo"), aggregateRootId: "test" });
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

        await bus.emit({ payload: new TestEvent1("apollo"), aggregateRootId: "test" });

        expect(handleSpy).toHaveBeenCalledTimes(1);
        expect(handleSpy).toHaveBeenCalledWith({ payload: new TestEvent1("apollo"), aggregateRootId: "test" });
        expect(handleSpy2).toHaveBeenCalledTimes(1);
        expect(handleSpy2).toHaveBeenCalledWith({ payload: new TestEvent1("apollo"), aggregateRootId: "test" });
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

        await bus.emit({ payload: new TestEvent2(), aggregateRootId: "test" });

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

        await bus.emitMultiple([
            { payload: new TestEvent1("apollo"), aggregateRootId: "test" },
            { payload: new TestEvent2(), aggregateRootId: "cc" }
        ]);

        expect(handleSpy).toHaveBeenCalledTimes(1);
        expect(handleSpy).toHaveBeenCalledWith({ payload: new TestEvent1("apollo"), aggregateRootId: "test" });
        expect(handleSpy2).toHaveBeenCalledTimes(2);
        expect(handleSpy2).toHaveBeenNthCalledWith(1, { payload: new TestEvent1("apollo"), aggregateRootId: "test" });
        expect(handleSpy2).toHaveBeenNthCalledWith(2, { payload: new TestEvent2(), aggregateRootId: "cc" });
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

        await bus.emitMultiple([
            { payload: new TestEvent2(), aggregateRootId: "test" },
            { payload: new TestEvent3(), aggregateRootId: "test" }
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

        await bus.emitMultiple([
            { payload: new TestEvent2(), aggregateRootId: "test2" },
            { payload: new TestEvent1("ev1"), aggregateRootId: "test1" }
        ]);

        expect(handleSpy).toHaveBeenCalledTimes(1);
        expect(handleSpy).toHaveBeenCalledWith({ payload: new TestEvent1("ev1"), aggregateRootId: "test1" });
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

        const bus = new DomainEventEmitter(true);
        bus.bindSubscriptions(injectorModules);

        await bus.emitMultiple([
            { payload: new TestEvent2(), aggregateRootId: "test2" },
            { payload: new TestEvent1("ev1"), aggregateRootId: "test1" }
        ]);

        expect(handleSpy).toHaveBeenCalledTimes(1);
        expect(handleSpy).toHaveBeenCalledWith({ payload: new TestEvent1("ev1"), aggregateRootId: "test1" });
        expect(handleSpy2).toHaveBeenCalledTimes(1);
        expect(handleSpy2).toHaveBeenCalledWith({ payload: new TestEvent2(), aggregateRootId: "test2" });
        expect(handledParameters).toEqual([2, 1]);
    }, 10000);

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
        const handleSpy2 = jest.spyOn(subscription2, "onDomainEvent").mockImplementation(() => {
            return firstValueFrom(
                timer(2000).pipe(
                    mergeMap(() => {
                        return throwError(() => new Error("test"));
                    })
                )
            );
        });

        const bus = new DomainEventEmitter(true);
        bus.bindSubscriptions(injectorModules);

        await expect(
            bus.emitMultiple([
                { payload: new TestEvent2(), aggregateRootId: "test2" },
                { payload: new TestEvent1("ev1"), aggregateRootId: "test1" }
            ])
        ).rejects.toThrow(Error);

        expect(handleSpy).toHaveBeenCalledTimes(0);
        expect(handleSpy2).toHaveBeenCalledTimes(1);
        expect(handleSpy2).toHaveBeenCalledWith({ payload: new TestEvent2(), aggregateRootId: "test2" });
        expect(handledParameters).toEqual([]);
    }, 10000);
});
