import { AggregateRoot, AggregateRootName, ApplyEvent, StoredEvent } from "@event-nest/core";

import { OrderCreatedEvent, OrderStatusChanged } from "./order-events";

export interface OrderModel {
    status: "paid" | "pending" | "shipping";
    userId: string;
}

@AggregateRootName("order")
export class Order extends AggregateRoot<OrderModel> {
    static snapshotRevision = 1;
    private status: OrderModel["status"];
    private userId: string;

    constructor(id: string) {
        super(id);
    }

    static create(id: string, userId: string) {
        const order = new Order(id);
        const event = new OrderCreatedEvent(userId);
        order.processOrderCreatedEvent(event);
        order.append(event);

        return order;
    }

    public static fromEvents(id: string, events: Array<StoredEvent>): Order {
        const order = new Order(id);
        order.reconstitute(events);
        return order;
    }

    public static fromSnapshot(id: string, snapshot: OrderModel, events: Array<StoredEvent>): Order {
        const order = new Order(id);
        order.applySnapshot(snapshot);
        order.reconstitute(events);
        return order;
    }

    applySnapshot(snapshot: OrderModel) {
        this.userId = snapshot.userId;
        this.status = snapshot.status;
    }

    toSnapshot() {
        return {
            status: this.status,
            userId: this.userId
        };
    }

    updateStatus(status: OrderModel["status"]) {
        const event = new OrderStatusChanged(status);
        this.processOrderStatusChanged(event);
        this.append(event);
    }

    @ApplyEvent(OrderCreatedEvent)
    private processOrderCreatedEvent(event: OrderCreatedEvent) {
        this.userId = event.userId;
    }

    @ApplyEvent(OrderStatusChanged)
    private processOrderStatusChanged(event: OrderStatusChanged) {
        this.status = event.status;
    }
}
