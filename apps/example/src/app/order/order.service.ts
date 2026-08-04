import { EVENT_STORE, type EventStore } from "@event-nest/core";
import { Inject, Injectable } from "@nestjs/common";
import { ObjectId } from "mongodb";

import { Order, OrderModel } from "./order";

@Injectable()
export class OrderService {
    constructor(@Inject(EVENT_STORE) private _eventStore: EventStore) {}

    async createOrder(userId: string) {
        const order = Order.create(new ObjectId().toHexString(), userId);
        const userWithPublisher = this._eventStore.addPublisher(order);
        await userWithPublisher.commit();
        return order.id;
    }

    async updateOrder(id: string, newStatus: OrderModel["status"]) {
        let order: Order;
        try {
            const { aggregateRootVersion, events, snapshot } = await this._eventStore.findWithSnapshot(Order, id);
            order = Order.fromEvents(id, events, snapshot, aggregateRootVersion);
        } catch {
            //fallback to full events reconstitution
            const events = await this._eventStore.findByAggregateRootId(Order, id);
            order = Order.fromEvents(id, events);
        }

        const orderWithPublisher = this._eventStore.addPublisher(order);
        order.updateStatus(newStatus);
        await orderWithPublisher.commit();
    }
}
