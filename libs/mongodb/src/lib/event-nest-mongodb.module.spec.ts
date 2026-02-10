import { DomainEventEmitter, EVENT_STORE, NoSnapshotStrategy, SnapshotStrategy } from "@event-nest/core";
import { createMock } from "@golevelup/ts-jest";
import { Provider } from "@nestjs/common";
import { ModulesContainer } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { MongoClient } from "mongodb";

import { EventNestMongoDbModule } from "./event-nest-mongodb.module";
import { ModuleProviders } from "./module-providers";
import { MongoEventStore } from "./storage/mongo-event-store";
import { MongoSnapshotStore } from "./storage/mongo-snapshot-store";

describe("EventNestMongoDbModule", () => {
    describe("global factories", () => {
        test("forRoot returns configured global module", () => {
            const options = {
                aggregatesCollection: "aggregates",
                connectionUri: "mongodb://localhost:27017/event-nest",
                eventsCollection: "events"
            };

            const emitter = createMock<DomainEventEmitter>();

            const mockedProviders: Provider[] = [
                {
                    provide: EVENT_STORE,
                    useValue: createMock<MongoEventStore>()
                },
                {
                    provide: DomainEventEmitter,
                    useValue: emitter
                }
            ];
            jest.spyOn(ModuleProviders, "create").mockReturnValue(mockedProviders);

            const module = EventNestMongoDbModule.forRoot(options);

            expect(module.global).toBe(true);
            expect(module.exports).toEqual([EVENT_STORE]);
            expect(module.providers).toEqual(mockedProviders);
        });

        test("forRootAsync returns configured global module", () => {
            const options = {
                useFactory: () => ({
                    aggregatesCollection: "aggregates",
                    connectionUri: "mongodb://localhost:27017/event-nest",
                    eventsCollection: "events"
                })
            };

            const emitter = createMock<DomainEventEmitter>();

            const mockedProviders: Provider[] = [
                {
                    provide: DomainEventEmitter,
                    useValue: emitter
                },
                {
                    provide: SnapshotStrategy,
                    useValue: new NoSnapshotStrategy()
                },
                {
                    provide: "EVENT_NEST_MONGO_CLIENT",
                    useValue: createMock<MongoClient>()
                },
                {
                    provide: MongoSnapshotStore,
                    useValue: createMock<MongoSnapshotStore>()
                },
                {
                    provide: EVENT_STORE,
                    useValue: createMock<MongoEventStore>()
                }
            ];
            jest.spyOn(ModuleProviders, "createAsync").mockReturnValue(mockedProviders);

            const module = EventNestMongoDbModule.forRootAsync(options);

            expect(module.global).toBe(true);
            expect(module.exports).toEqual([EVENT_STORE]);
            expect(module.providers).toEqual(mockedProviders);
        });
    });

    describe("scoped factories", () => {
        test("register returns configured module", () => {
            const options = {
                aggregatesCollection: "aggregates",
                connectionUri: "mongodb://localhost:27017/event-nest",
                eventsCollection: "events"
            };

            const emitter = createMock<DomainEventEmitter>();

            const mockedProviders: Provider[] = [
                {
                    provide: DomainEventEmitter,
                    useValue: emitter
                },
                {
                    provide: SnapshotStrategy,
                    useValue: new NoSnapshotStrategy()
                },
                {
                    provide: "EVENT_NEST_MONGO_CLIENT",
                    useValue: createMock<MongoClient>()
                },
                {
                    provide: MongoSnapshotStore,
                    useValue: createMock<MongoSnapshotStore>()
                },
                {
                    provide: EVENT_STORE,
                    useValue: createMock<MongoEventStore>()
                }
            ];
            jest.spyOn(ModuleProviders, "create").mockReturnValue(mockedProviders);

            const module = EventNestMongoDbModule.register(options);

            expect(module.global).toBe(false);
            expect(module.exports).toEqual([EVENT_STORE]);
            expect(module.providers).toEqual(mockedProviders);
        });

        test("registerAsync returns configured module", () => {
            const options = {
                useFactory: () => ({
                    aggregatesCollection: "aggregates",
                    connectionUri: "mongodb://localhost:27017/event-nest",
                    eventsCollection: "events"
                })
            };

            const emitter = createMock<DomainEventEmitter>();

            const mockedProviders: Provider[] = [
                {
                    provide: DomainEventEmitter,
                    useValue: emitter
                },
                {
                    provide: SnapshotStrategy,
                    useValue: new NoSnapshotStrategy()
                },
                {
                    provide: "EVENT_NEST_MONGO_CLIENT",
                    useValue: createMock<MongoClient>()
                },
                {
                    provide: MongoSnapshotStore,
                    useValue: createMock<MongoSnapshotStore>()
                },
                {
                    provide: EVENT_STORE,
                    useValue: createMock<MongoEventStore>()
                }
            ];
            jest.spyOn(ModuleProviders, "createAsync").mockReturnValue(mockedProviders);

            const module = EventNestMongoDbModule.registerAsync(options);

            expect(module.global).toBe(false);
            expect(module.exports).toEqual([EVENT_STORE]);
            expect(module.providers).toEqual(mockedProviders);
        });
    });

    describe("onApplicationBootstrap", () => {
        test("binds subscriptions on startup", async () => {
            const emitter = createMock<DomainEventEmitter>();

            const mockedProviders: Provider[] = [
                {
                    provide: DomainEventEmitter,
                    useValue: emitter
                },
                {
                    provide: SnapshotStrategy,
                    useValue: new NoSnapshotStrategy()
                },
                {
                    provide: "EVENT_NEST_MONGO_CLIENT",
                    useValue: createMock<MongoClient>()
                },
                {
                    provide: MongoSnapshotStore,
                    useValue: createMock<MongoSnapshotStore>()
                },
                {
                    provide: EVENT_STORE,
                    useValue: createMock<MongoEventStore>()
                }
            ];
            jest.spyOn(ModuleProviders, "create").mockReturnValue(mockedProviders);

            const module = await Test.createTestingModule({
                imports: [
                    EventNestMongoDbModule.register({
                        aggregatesCollection: "aggregates",
                        connectionUri: "mongodb://localhost:27017/event-nest",
                        eventsCollection: "events"
                    })
                ]
            }).compile();

            const app = module.createNestApplication();
            await app.init();

            expect(emitter.bindSubscriptions).toHaveBeenCalledTimes(1);
            expect(emitter.bindSubscriptions).toHaveBeenCalledWith(module.get(ModulesContainer));
        });
    });
});
