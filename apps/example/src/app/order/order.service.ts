import { EVENT_STORE, EventStore } from "@event-nest/core";
import { Inject, Injectable } from "@nestjs/common";
import { ObjectId } from "mongodb";

import { Order, OrderModel } from "./order";

@Injectable()
export class OrderService {
    constructor(@Inject(EVENT_STORE) private _eventStore: EventStore) {}

    async createOrder(name: string, userId: string) {
        const order = Order.create(new ObjectId().toHexString(), userId);
        const userWithPublisher = this._eventStore.addPublisher(order);
        await userWithPublisher.commit();
        return order.id;
    }

    async updateOrder(id: string, newStatus: OrderModel["status"]) {
        let order: Order;
        try {
            const { events, snapshot } = await this._eventStore.findWithSnapshot(Order, id);
            order = Order.fromSnapshot(id, snapshot, events);
        } catch {
            //fallback to full events reconstituion
            const events = await this._eventStore.findByAggregateRootId(Order, id);
            order = Order.fromEvents(id, events);
        }

        const orderWithPublisher = this._eventStore.addPublisher(order);
        order.updateStatus(newStatus);
        await orderWithPublisher.commit();
    }
}
