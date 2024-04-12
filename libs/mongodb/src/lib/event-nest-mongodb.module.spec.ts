import { DomainEventEmitter, EVENT_STORE } from "@event-nest/core";
import { createMock } from "@golevelup/ts-jest";
import { Provider } from "@nestjs/common";
import { ModulesContainer } from "@nestjs/core";
import { Test } from "@nestjs/testing";

import { EventNestMongoDbModule } from "./event-nest-mongodb.module";
import { ModuleProviders } from "./module-providers";
import { MongoEventStore } from "./storage/mongo-event-store";

test("binds subscriptions on startup", async () => {
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
