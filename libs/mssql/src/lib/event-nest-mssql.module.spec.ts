import { DomainEventEmitter, EVENT_STORE } from "@event-nest/core";
import { createMock } from "@golevelup/ts-jest";
import { Provider } from "@nestjs/common";
import { ModulesContainer } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { Knex } from "knex";

import { EventNestMSSQLModule } from "./event-nest-mssql.module";
import { KNEX_CONNECTION, ModuleProviders } from "./module-providers";
import { MSSQLModuleOptions } from "./mssql-module-options";
import { MSSQLEventStore } from "./storage/mssql-event-store";

describe("EventNestMSSQLModule", () => {
    const options: MSSQLModuleOptions = {
        aggregatesTableName: "aggregates",
        connection: {
            database: "event_nest",
            password: "Password!123",
            server: "localhost",
            user: "sa"
        },
        eventsTableName: "events",
        schemaName: "dbo"
    };

    describe("forRoot", () => {
        test("returns configured global module", () => {
            const emitter = createMock<DomainEventEmitter>();

            const mockedProviders: Provider[] = [
                {
                    provide: EVENT_STORE,
                    useValue: createMock<MSSQLEventStore>()
                },
                {
                    provide: DomainEventEmitter,
                    useValue: emitter
                },
                {
                    provide: KNEX_CONNECTION,
                    useValue: createMock<Knex>()
                }
            ];
            jest.spyOn(ModuleProviders, "create").mockReturnValue(mockedProviders);

            const module = EventNestMSSQLModule.forRoot(options);

            expect(module.global).toBe(true);
            expect(module.exports).toEqual([EVENT_STORE]);
            expect(module.providers).toEqual(mockedProviders);
        });
    });

    describe("forRootAsync", () => {
        test("returns configured global module", () => {
            const emitter = createMock<DomainEventEmitter>();

            const mockedProviders: Provider[] = [
                {
                    provide: EVENT_STORE,
                    useValue: createMock<MSSQLEventStore>()
                },
                {
                    provide: DomainEventEmitter,
                    useValue: emitter
                },
                {
                    provide: KNEX_CONNECTION,
                    useValue: createMock<Knex>()
                }
            ];
            jest.spyOn(ModuleProviders, "createAsync").mockReturnValue(mockedProviders);

            const module = EventNestMSSQLModule.forRootAsync({ useFactory: () => options });

            expect(module.global).toBe(true);
            expect(module.exports).toEqual([EVENT_STORE]);
            expect(module.providers).toEqual(mockedProviders);
        });
    });

    describe("register", () => {
        test("returns configured module", () => {
            const emitter = createMock<DomainEventEmitter>();

            const mockedProviders: Provider[] = [
                {
                    provide: EVENT_STORE,
                    useValue: createMock<MSSQLEventStore>()
                },
                {
                    provide: DomainEventEmitter,
                    useValue: emitter
                },
                {
                    provide: KNEX_CONNECTION,
                    useValue: createMock<Knex>()
                }
            ];
            jest.spyOn(ModuleProviders, "create").mockReturnValue(mockedProviders);

            const module = EventNestMSSQLModule.register(options);

            expect(module.global).toBe(false);
            expect(module.exports).toEqual([EVENT_STORE]);
            expect(module.providers).toEqual(mockedProviders);
        });
    });

    describe("registerAsync", () => {
        test("returns configured module", () => {
            const emitter = createMock<DomainEventEmitter>();

            const mockedProviders: Provider[] = [
                {
                    provide: EVENT_STORE,
                    useValue: createMock<MSSQLEventStore>()
                },
                {
                    provide: DomainEventEmitter,
                    useValue: emitter
                },
                {
                    provide: KNEX_CONNECTION,
                    useValue: createMock<Knex>()
                }
            ];
            jest.spyOn(ModuleProviders, "createAsync").mockReturnValue(mockedProviders);

            const module = EventNestMSSQLModule.registerAsync({ useFactory: () => options });

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
                    provide: EVENT_STORE,
                    useValue: createMock<MSSQLEventStore>()
                },
                {
                    provide: DomainEventEmitter,
                    useValue: emitter
                },
                {
                    provide: KNEX_CONNECTION,
                    useValue: createMock<Knex>()
                }
            ];
            jest.spyOn(ModuleProviders, "create").mockReturnValue(mockedProviders);

            const module = await Test.createTestingModule({
                imports: [EventNestMSSQLModule.register(options)]
            }).compile();

            const app = module.createNestApplication();
            await app.init();

            expect(emitter.bindSubscriptions).toHaveBeenCalledTimes(1);
            expect(emitter.bindSubscriptions).toHaveBeenCalledWith(module.get(ModulesContainer));
        });

        test("binds subscriptions on startup when module is async", async () => {
            const emitter = createMock<DomainEventEmitter>();

            const mockedProviders: Provider[] = [
                {
                    provide: EVENT_STORE,
                    useValue: createMock<MSSQLEventStore>()
                },
                {
                    provide: DomainEventEmitter,
                    useValue: emitter
                },
                {
                    provide: KNEX_CONNECTION,
                    useValue: createMock<Knex>()
                }
            ];
            jest.spyOn(ModuleProviders, "createAsync").mockReturnValue(mockedProviders);

            const module = await Test.createTestingModule({
                imports: [EventNestMSSQLModule.registerAsync({ useFactory: () => options })]
            }).compile();

            const app = module.createNestApplication();
            await app.init();

            expect(emitter.bindSubscriptions).toHaveBeenCalledTimes(1);
            expect(emitter.bindSubscriptions).toHaveBeenCalledWith(module.get(ModulesContainer));
        });
    });

    describe("onApplicationShutdown", () => {
        test("destroys the knex connection on shutdown", async () => {
            const connection = createMock<Knex>();

            const mockedProviders: Provider[] = [
                {
                    provide: EVENT_STORE,
                    useValue: createMock<MSSQLEventStore>()
                },
                {
                    provide: DomainEventEmitter,
                    useValue: createMock<DomainEventEmitter>()
                },
                {
                    provide: KNEX_CONNECTION,
                    useValue: connection
                }
            ];
            jest.spyOn(ModuleProviders, "create").mockReturnValue(mockedProviders);

            const module = await Test.createTestingModule({
                imports: [EventNestMSSQLModule.register(options)]
            }).compile();

            const app = module.createNestApplication();
            app.enableShutdownHooks();
            await app.init();
            await app.close();

            expect(connection.destroy).toHaveBeenCalledTimes(1);
        });
    });
});
