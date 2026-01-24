import {
    AllOfSnapshotStrategy,
    AnyOfSnapshotStrategy,
    ForAggregateRootsStrategy,
    ForCountSnapshotStrategy,
    ForEventsSnapshotStrategy
} from "@event-nest/core";
import { EventNestMongoDbModule } from "@event-nest/mongodb";
import { Module } from "@nestjs/common";

import { AppController } from "./app.controller";
import { Order } from "./order/order";
import { OrderStatusChanged } from "./order/order-events";
import { OrderModule } from "./order/order.module";
import { User } from "./user/user";
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
                    eventsCollection: "events-collection",
                    snapshotCollection: "snapshots-collection",
                    snapshotStrategy: new AnyOfSnapshotStrategy([
                        new AllOfSnapshotStrategy([
                            new ForAggregateRootsStrategy({ aggregates: [Order] }),
                            new ForEventsSnapshotStrategy({ eventClasses: [OrderStatusChanged] })
                        ]),
                        new AllOfSnapshotStrategy([
                            new ForAggregateRootsStrategy({ aggregates: [User] }),
                            new ForCountSnapshotStrategy({ count: 10 })
                        ])
                    ])
                };
            }
        }),
        OrderModule
    ],
    providers: [UserService, UserEventSubscription]
})
export class AppModule {}
