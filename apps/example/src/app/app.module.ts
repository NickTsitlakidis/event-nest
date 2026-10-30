import {
    AllOfSnapshotStrategy,
    AnyOfSnapshotStrategy,
    ForAggregateRootsStrategy,
    ForCountSnapshotStrategy,
    ForEventsSnapshotStrategy
} from "@event-nest/core";
import { EventNestPostgreSQLModule } from "@event-nest/postgresql";
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
        EventNestPostgreSQLModule.forRootAsync({
            useFactory: async () => {
                return {
                    aggregatesTableName: "aggregates",
                    concurrentSubscriptions: false,
                    connectionUri: "postgresql://postgres:postgres@localhost:5432/example",
                    ensureTablesExist: true,
                    eventsTableName: "events",
                    // The adapter creates tables but never schemas, so "public" keeps a fresh database runnable.
                    schemaName: "public",
                    snapshotStrategy: new AnyOfSnapshotStrategy([
                        new AllOfSnapshotStrategy([
                            new ForAggregateRootsStrategy({ aggregates: [Order] }),
                            new ForEventsSnapshotStrategy({ eventClasses: [OrderStatusChanged] })
                        ]),
                        new AllOfSnapshotStrategy([
                            new ForAggregateRootsStrategy({ aggregates: [User] }),
                            new ForCountSnapshotStrategy({ count: 10 })
                        ])
                    ]),
                    snapshotTableName: "snapshots"
                };
            }
        }),
        OrderModule
    ],
    providers: [UserService, UserEventSubscription]
})
export class AppModule {}
