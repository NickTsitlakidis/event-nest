import { createMock } from "@golevelup/ts-jest";
import { InjectionToken, Logger } from "@nestjs/common";
import { Injectable } from "@nestjs/common/interfaces";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { Module } from "@nestjs/core/injector/module";
import { delay } from "es-toolkit";
import { firstValueFrom, map, mergeMap, throwError, timer } from "rxjs";

import { DomainEventEmitter } from "./domain-event-emitter";
import { DomainEventSubscription } from "./domain-event-subscription";
import { SubscriptionException } from "./exceptions/subscription-exception";
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

@DomainEventSubscription({ eventClasses: [Event2], isAsync: false })
class TestEvent2SyncSubscription implements OnDomainEvent<Event2> {
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
const event2 = (eventId: string, version: number) => ({
    aggregateRootId: "test",
    eventId,
    occurredAt: new Date(),
    payload: new Event2(),
    version
});

describe("DomainEventEmitter", () => {
    describe("onModuleDestroy", () => {
        test("stops calling subscriptions", () => {
            const emitter = new DomainEventEmitter();

            const asyncSubscription = new TestEvent2Subscription();
            const syncSubscription = new TestEvent2SyncSubscription();
            const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>([
                [TestEvent2Subscription, createMock<InstanceWrapper<Injectable>>({ instance: asyncSubscription })],
                [TestEvent2SyncSubscription, createMock<InstanceWrapper<Injectable>>({ instance: syncSubscription })]
            ]);
            const injectorModules = new Map<string, Module>([
                ["test", createMock<Module>({ providers: providersMap })]
            ]);

            const asyncSpy = jest.spyOn(asyncSubscription, "onDomainEvent");
            const syncSpy = jest.spyOn(syncSubscription, "onDomainEvent");

            const creationDate = new Date();
            emitter.bindSubscriptions(injectorModules);

            emitter.emitMultiple([
                {
                    aggregateRootId: "test",
                    eventId: "ev-id",
                    occurredAt: creationDate,
                    payload: new Event2(),
                    version: 1
                }
            ]);
            emitter.onModuleDestroy();

            emitter.emitMultiple([
                {
                    aggregateRootId: "test",
                    eventId: "ev-id2",
                    occurredAt: creationDate,
                    payload: new Event2(),
                    version: 2
                }
            ]);

            expect(asyncSpy).toHaveBeenCalledTimes(1);
            expect(syncSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("emitMultiple", () => {
        test("throws mapped exception when sync subscription throws", async () => {
            const syncSubscription = new TestEvent2SyncSubscription();

            const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>([
                [TestEvent2SyncSubscription, createMock<InstanceWrapper<Injectable>>({ instance: syncSubscription })]
            ]);
            const injectorModules = new Map<string, Module>([
                ["test", createMock<Module>({ providers: providersMap })]
            ]);

            const syncSpy = jest.spyOn(syncSubscription, "onDomainEvent").mockRejectedValue(new Error("a new error"));

            const emitter = new DomainEventEmitter();
            emitter.bindSubscriptions(injectorModules);

            const creationDate2 = new Date();

            await expect(
                emitter.emitMultiple([
                    {
                        aggregateRootId: "test2",
                        eventId: "ev-id2",
                        occurredAt: creationDate2,
                        payload: new Event2(),
                        version: 2
                    }
                ])
            ).rejects.toThrow(SubscriptionException);

            expect(syncSpy).toHaveBeenCalledTimes(1);
        });

        describe("when a subscription throws synchronously instead of rejecting", () => {
            let errorLogSpy: jest.SpyInstance;
            let debugLogSpy: jest.SpyInstance;

            beforeEach(() => {
                errorLogSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(jest.fn());
                debugLogSpy = jest.spyOn(Logger.prototype, "debug").mockImplementation(jest.fn());
            });

            afterEach(() => {
                errorLogSpy.mockRestore();
                debugLogSpy.mockRestore();
            });

            test("rejects with mapped exception for sync subscription when running sequentially", async () => {
                const syncSubscription = new TestEvent2SyncSubscription();
                const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>([
                    [
                        TestEvent2SyncSubscription,
                        createMock<InstanceWrapper<Injectable>>({ instance: syncSubscription })
                    ]
                ]);
                const injectorModules = new Map<string, Module>([
                    ["test", createMock<Module>({ providers: providersMap })]
                ]);
                jest.spyOn(syncSubscription, "onDomainEvent").mockImplementation(() => {
                    throw new Error("sync failure");
                });

                const emitter = new DomainEventEmitter(false);
                emitter.bindSubscriptions(injectorModules);

                let rejection: unknown;
                try {
                    await emitter.emitMultiple([event2("ev-id", 1)]);
                } catch (error) {
                    rejection = error;
                }

                expect(rejection).toBeInstanceOf(SubscriptionException);
                expect((rejection as SubscriptionException).caughtError.message).toBe("sync failure");
                expect((rejection as SubscriptionException).eventClassName).toBe("Event2");
                expect((rejection as SubscriptionException).eventId).toBe("ev-id");
                expect(errorLogSpy).toHaveBeenCalledWith("Error while emitting event Event2 : sync failure");
            });

            test("rejects with mapped exception for sync subscription when running concurrently", async () => {
                const syncSubscription = new TestEvent2SyncSubscription();
                const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>([
                    [
                        TestEvent2SyncSubscription,
                        createMock<InstanceWrapper<Injectable>>({ instance: syncSubscription })
                    ]
                ]);
                const injectorModules = new Map<string, Module>([
                    ["test", createMock<Module>({ providers: providersMap })]
                ]);
                jest.spyOn(syncSubscription, "onDomainEvent").mockImplementation(() => {
                    throw new Error("sync failure");
                });

                const emitter = new DomainEventEmitter(true);
                emitter.bindSubscriptions(injectorModules);

                let result: Promise<unknown> | undefined;
                expect(() => {
                    result = emitter.emitMultiple([event2("ev-id", 1)]);
                }).not.toThrow();
                await expect(result).rejects.toThrow(SubscriptionException);
                expect(errorLogSpy).toHaveBeenCalledWith("Error while emitting event Event2 : sync failure");
            });

            test("logs error and stops the chain for async subscription when running sequentially", async () => {
                const subscription1 = new TestEvent2Subscription();
                const subscription2 = new TestSubscription();
                const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>([
                    [TestEvent2Subscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription1 })],
                    [TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription2 })]
                ]);
                const injectorModules = new Map<string, Module>([
                    ["test", createMock<Module>({ providers: providersMap })]
                ]);
                jest.spyOn(subscription1, "onDomainEvent").mockImplementation(() => {
                    throw new Error("sync failure");
                });
                const laterSpy = jest.spyOn(subscription2, "onDomainEvent");

                const emitter = new DomainEventEmitter(false);
                emitter.bindSubscriptions(injectorModules);

                let result: Promise<unknown> | undefined;
                expect(() => {
                    result = emitter.emitMultiple([
                        event2("ev-id", 1),
                        {
                            aggregateRootId: "test",
                            eventId: "ev-id2",
                            occurredAt: new Date(),
                            payload: new Event1("ev1"),
                            version: 2
                        }
                    ]);
                }).not.toThrow();
                await expect(result).resolves.toBeUndefined();
                await delay(50);

                expect(errorLogSpy).toHaveBeenCalledWith("Error while emitting event Event2 : sync failure");
                expect(debugLogSpy).toHaveBeenCalledWith(
                    "Stopped sequential emission after subscription error for event Event2"
                );
                expect(laterSpy).not.toHaveBeenCalled();
            });

            test("logs error and resolves for async subscription when running concurrently", async () => {
                const subscription = new TestEvent2Subscription();
                const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>([
                    [TestEvent2Subscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription })]
                ]);
                const injectorModules = new Map<string, Module>([
                    ["test", createMock<Module>({ providers: providersMap })]
                ]);
                jest.spyOn(subscription, "onDomainEvent").mockImplementation(() => {
                    throw new Error("sync failure");
                });

                const emitter = new DomainEventEmitter(true);
                emitter.bindSubscriptions(injectorModules);

                let result: Promise<unknown> | undefined;
                expect(() => {
                    result = emitter.emitMultiple([event2("ev-id", 1)]);
                }).not.toThrow();
                await expect(result).resolves.toBeUndefined();
                await delay(50);

                expect(errorLogSpy).toHaveBeenCalledWith("Error while emitting event Event2 : sync failure");
            });
        });

        test("waits for sync subscriptions when running concurrently", async () => {
            const syncSubscription = new TestEvent2SyncSubscription();
            const asyncSubscription = new TestSubscription();

            const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>([
                [TestEvent2SyncSubscription, createMock<InstanceWrapper<Injectable>>({ instance: syncSubscription })],
                [TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: asyncSubscription })]
            ]);
            const injectorModules = new Map<string, Module>([
                ["test", createMock<Module>({ providers: providersMap })]
            ]);

            const handledParameters: Array<any> = [];
            const asyncSpy = jest.spyOn(asyncSubscription, "onDomainEvent").mockImplementation(() => {
                return firstValueFrom(
                    timer(800).pipe(
                        map(() => {
                            handledParameters.push(1);
                            return "anything";
                        })
                    )
                );
            });
            const syncSpy = jest.spyOn(syncSubscription, "onDomainEvent").mockImplementation(() => {
                return firstValueFrom(
                    timer(400).pipe(
                        map(() => {
                            handledParameters.push(2);
                            return "anything";
                        })
                    )
                );
            });

            const emitter = new DomainEventEmitter(true);
            emitter.bindSubscriptions(injectorModules);

            const creationDate1 = new Date();
            const creationDate2 = new Date();

            await emitter.emitMultiple([
                {
                    aggregateRootId: "test1",
                    eventId: "ev-id",
                    occurredAt: creationDate1,
                    payload: new Event1("ev1"),
                    version: 1
                },
                {
                    aggregateRootId: "test2",
                    eventId: "ev-id2",
                    occurredAt: creationDate2,
                    payload: new Event2(),
                    version: 2
                }
            ]);

            expect(handledParameters).toEqual([2]);
            await delay(500);
            expect(asyncSpy).toHaveBeenCalledTimes(1);
            expect(syncSpy).toHaveBeenCalledTimes(1);
            expect(handledParameters).toEqual([2, 1]);
        });

        test("waits for sync subscriptions when running sequentially", async () => {
            const syncSubscription = new TestEvent2SyncSubscription();
            const asyncSubscription = new TestSubscription();

            const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>([
                [TestEvent2SyncSubscription, createMock<InstanceWrapper<Injectable>>({ instance: syncSubscription })],
                [TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: asyncSubscription })]
            ]);
            const injectorModules = new Map<string, Module>([
                ["test", createMock<Module>({ providers: providersMap })]
            ]);

            const handledParameters: Array<any> = [];
            const asyncSpy = jest.spyOn(asyncSubscription, "onDomainEvent").mockImplementation(() => {
                return firstValueFrom(
                    timer(500).pipe(
                        map(() => {
                            handledParameters.push(1);
                            return "anything";
                        })
                    )
                );
            });
            const syncSpy = jest.spyOn(syncSubscription, "onDomainEvent").mockImplementation(() => {
                return firstValueFrom(
                    timer(1000).pipe(
                        map(() => {
                            handledParameters.push(2);
                            return "anything";
                        })
                    )
                );
            });

            const emitter = new DomainEventEmitter();
            emitter.bindSubscriptions(injectorModules);

            const creationDate1 = new Date();
            const creationDate2 = new Date();

            await emitter.emitMultiple([
                {
                    aggregateRootId: "test1",
                    eventId: "ev-id",
                    occurredAt: creationDate1,
                    payload: new Event1("ev1"),
                    version: 1
                },
                {
                    aggregateRootId: "test2",
                    eventId: "ev-id2",
                    occurredAt: creationDate2,
                    payload: new Event2(),
                    version: 2
                }
            ]);

            expect(asyncSpy).toHaveBeenCalledTimes(1);
            expect(syncSpy).toHaveBeenCalledTimes(1);
            expect(handledParameters).toEqual([1, 2]);
        });

        test("return immediately when running sequentially with only async subscriptions", async () => {
            const event2Subscription = new TestEvent2Subscription();
            const event1Subscription = new TestSubscription();

            const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>([
                [TestEvent2Subscription, createMock<InstanceWrapper<Injectable>>({ instance: event2Subscription })],
                [TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: event1Subscription })]
            ]);
            const injectorModules = new Map<string, Module>([
                ["test", createMock<Module>({ providers: providersMap })]
            ]);

            const handledParameters: Array<any> = [];
            const asyncSpy = jest.spyOn(event2Subscription, "onDomainEvent").mockImplementation(() => {
                return firstValueFrom(
                    timer(500).pipe(
                        map(() => {
                            handledParameters.push(1);
                            return "anything";
                        })
                    )
                );
            });
            const syncSpy = jest.spyOn(event1Subscription, "onDomainEvent").mockImplementation(() => {
                return firstValueFrom(
                    timer(1000).pipe(
                        map(() => {
                            handledParameters.push(2);
                            return "anything";
                        })
                    )
                );
            });

            const emitter = new DomainEventEmitter();
            emitter.bindSubscriptions(injectorModules);

            const creationDate1 = new Date();
            const creationDate2 = new Date();

            await expect(
                emitter.emitMultiple([
                    {
                        aggregateRootId: "test1",
                        eventId: "ev-id",
                        occurredAt: creationDate1,
                        payload: new Event1("ev1"),
                        version: 1
                    },
                    {
                        aggregateRootId: "test2",
                        eventId: "ev-id2",
                        occurredAt: creationDate2,
                        payload: new Event2(),
                        version: 2
                    }
                ])
            ).resolves.toBeUndefined();

            await delay(2000);

            expect(asyncSpy).toHaveBeenCalledTimes(1);
            expect(syncSpy).toHaveBeenCalledTimes(1);
            expect(handledParameters).toEqual([2, 1]);
        });

        test("emits to subscriptions with multiple events", async () => {
            const subscription1 = new TestSubscription();
            const subscription2 = new WithMultiple();

            const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>([
                [TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription1 })],
                [WithMultiple, createMock<InstanceWrapper<Injectable>>({ instance: subscription2 })]
            ]);
            const injectorModules = new Map<string, Module>([
                ["test", createMock<Module>({ providers: providersMap })]
            ]);

            const handleSpy = jest.spyOn(subscription1, "onDomainEvent").mockResolvedValue("anything");
            const handleSpy2 = jest.spyOn(subscription2, "onDomainEvent").mockResolvedValue("anything");

            const emitter = new DomainEventEmitter();
            emitter.bindSubscriptions(injectorModules);

            const creationDate1 = new Date();
            const creationDate2 = new Date();
            await emitter.emitMultiple([
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

            await delay(200);
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
            const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>([
                [TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription1 })]
            ]);
            const injectorModules = new Map<string, Module>([
                ["test", createMock<Module>({ providers: providersMap })]
            ]);

            const handleSpy = jest.spyOn(subscription1, "onDomainEvent").mockResolvedValue("anything");

            const emitter = new DomainEventEmitter();
            emitter.bindSubscriptions(injectorModules);

            const creationDate1 = new Date();
            const creationDate2 = new Date();
            await emitter.emitMultiple([
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
            const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>([
                [TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription1 })]
            ]);
            const injectorModules = new Map<string, Module>([
                ["test", createMock<Module>({ providers: providersMap })]
            ]);

            const handleSpy = jest.spyOn(subscription1, "onDomainEvent").mockResolvedValue("anything");

            const emitter = new DomainEventEmitter();
            emitter.bindSubscriptions(injectorModules);

            const creationDate1 = new Date();
            const creationDate2 = new Date();
            await emitter.emitMultiple([
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
            const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>([
                [TestEvent2Subscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription2 })],
                [TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription1 })]
            ]);
            const injectorModules = new Map<string, Module>([
                ["test", createMock<Module>({ providers: providersMap })]
            ]);

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

            const emitter = new DomainEventEmitter(false);
            emitter.bindSubscriptions(injectorModules);

            const creationDate1 = new Date();
            const creationDate2 = new Date();
            await emitter.emitMultiple([
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

            await delay(2000);
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
            const providersMap = new Map<InjectionToken, InstanceWrapper<Injectable>>([
                [TestEvent2Subscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription2 })],
                [TestSubscription, createMock<InstanceWrapper<Injectable>>({ instance: subscription1 })]
            ]);
            const injectorModules = new Map<string, Module>([
                ["test", createMock<Module>({ providers: providersMap })]
            ]);

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

            const emitter = new DomainEventEmitter(false);
            emitter.bindSubscriptions(injectorModules);

            const creationDate1 = new Date();
            const creationDate2 = new Date();

            await emitter.emitMultiple([
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

            // Wait for the failing subscription to settle and verify the chain stopped there. This also keeps
            // the rejection inside the test instead of letting it escape after the suite has finished.
            await delay(1500);
            expect(handleSpy).toHaveBeenCalledTimes(0);
            expect(handledParameters).toEqual([]);
        }, 10_000);
    });
});
