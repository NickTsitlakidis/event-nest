import { Module } from "@nestjs/common";

import { AppController } from "./app.controller";
import { UserService } from "./user/user.service";
import { EventNestMongoDbModule } from "@event-nest/mongodb";
import { UserEventSubscription } from "./user/user-event-subscription";

@Module({
    imports: [
        EventNestMongoDbModule.registerAsync({
            useFactory: async () => {
                return {
                    connectionUri: "mongodb://localhost:27017/example",
                    aggregatesCollection: "aggregates-collection",
                    eventsCollection: "events-collection",
                    concurrentSubscriptions: false
                };
            }
        })
    ],
    controllers: [AppController],
    providers: [UserService, UserEventSubscription]
})
export class AppModule {}
