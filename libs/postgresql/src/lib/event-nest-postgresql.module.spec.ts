import { DomainEventEmitter, EVENT_STORE } from "@event-nest/core";
import { createMock } from "@golevelup/ts-jest";
import { Provider } from "@nestjs/common";
import { ModulesContainer } from "@nestjs/core";
import { Test } from "@nestjs/testing";

import { EventNestPostgreSQLModule } from "./event-nest-postgresql.module";
import { ModuleProviders } from "./module-providers";
import { PostgreSQLEventStore } from "./storage/postgresql-event-store";

test("binds subscriptions on startup", async () => {
    const emitter = createMock<DomainEventEmitter>();

    const mockedProviders: Provider[] = [
        {
            provide: EVENT_STORE,
            useValue: createMock<PostgreSQLEventStore>()
        },
        {
            provide: DomainEventEmitter,
            useValue: emitter
        }
    ];
    jest.spyOn(ModuleProviders, "create").mockReturnValue(mockedProviders);

    const module = await Test.createTestingModule({
        imports: [
            EventNestPostgreSQLModule.register({
                aggregatesTableName: "aggregates",
                connectionUri: "postgres://test:test@docker:32770/event-nest",
                eventsTableName: "events",
                schemaName: "the-schema"
            })
        ]
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
            useValue: createMock<PostgreSQLEventStore>()
        },
        {
            provide: DomainEventEmitter,
            useValue: emitter
        }
    ];
    jest.spyOn(ModuleProviders, "createAsync").mockReturnValue(mockedProviders);

    const module = await Test.createTestingModule({
        imports: [
            EventNestPostgreSQLModule.registerAsync({
                useFactory: () => ({
                    aggregatesTableName: "aggregates",
                    connectionUri: "postgres://test:test@docker:32770/event-nest",
                    eventsTableName: "events",
                    schemaName: "the-schema"
                })
            })
        ]
    }).compile();

    const app = module.createNestApplication();
    await app.init();

    expect(emitter.bindSubscriptions).toHaveBeenCalledTimes(1);
    expect(emitter.bindSubscriptions).toHaveBeenCalledWith(module.get(ModulesContainer));
});
