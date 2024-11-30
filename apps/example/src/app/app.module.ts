import { EventNestMongoDbModule } from "@event-nest/mongodb";
import { Module } from "@nestjs/common";

import { AppController } from "./app.controller";
import { UserEventSubscription } from "./user/user-event-subscription";
import { UserService } from "./user/user.service";

@Module({
    controllers: [AppController],
    imports: [
        EventNestMongoDbModule.forRootAsync({
            useFactory: async () => {
                return {
                    aggregatesCollection: "aggregates-collection",
                    concurrentSubscriptions: false,
                    connectionUri: "mongodb://localhost:27017/example",
                    eventsCollection: "events-collection"
                };
            }
        })
    ],
    providers: [UserService, UserEventSubscription]
})
export class AppModule {}
