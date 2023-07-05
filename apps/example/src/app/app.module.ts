import { Module } from "@nestjs/common";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { EventNestMongoDbModule } from "@event-nest/mongodb";

@Module({
    imports: [
        // EventNestMongoDbModule.register({
        //     connectionUri: "mongodb://localhost:27017/event-nest",
        //     aggregatesCollection: "aggregates-collection",
        //     eventsCollection: "events-collection"
        // })
        EventNestMongoDbModule.registerAsync({
            useFactory: async () => {
                return {
                    connectionUri: "mongodb://localhost:27017/event-nest",
                    aggregatesCollection: "aggregates-collection",
                    eventsCollection: "events-collection",
                    runParallelSubscriptions: true
                };
            }
        })
    ],
    controllers: [AppController],
    providers: [AppService]
})
export class AppModule {}
