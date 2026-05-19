import { AggregateRoot, AggregateRootConfig, ApplyEvent, SnapshotAware, StoredEvent } from "@event-nest/core";

import { OrderCreatedEvent, OrderStatusChanged } from "./order-events";

export interface OrderModel {
    status: "paid" | "pending" | "shipping";
    userId: string;
}

@AggregateRootConfig({ name: "Order", snapshotRevision: 1 })
export class Order extends AggregateRoot implements SnapshotAware<OrderModel> {
    private _status: "paid" | "pending" | "shipping";
    private _userId: string;

    constructor(id: string) {
        super(id);
        this._status = "pending";
        this._userId = "";
    }

    static create(id: string, userId: string) {
        const order = new Order(id);
        const event = new OrderCreatedEvent(userId);
        order.processOrderCreatedEvent(event);
        order.append(event);

        return order;
    }

    public static fromEvents(id: string, events: Array<StoredEvent>, snapshot?: OrderModel): Order {
        const order = new Order(id);
        order.reconstitute(events, snapshot);
        return order;
    }

    applySnapshot(snapshot: OrderModel) {
        this._userId = snapshot.userId;
        this._status = snapshot.status;
    }

    toSnapshot() {
        return {
            status: this._status,
            userId: this._userId
        };
    }

    updateStatus(status: OrderModel["status"]) {
        const event = new OrderStatusChanged(status);
        this.processOrderStatusChanged(event);
        this.append(event);
    }

    @ApplyEvent(OrderCreatedEvent)
    private processOrderCreatedEvent(event: OrderCreatedEvent) {
        this._userId = event.userId;
    }

    @ApplyEvent(OrderStatusChanged)
    private processOrderStatusChanged(event: OrderStatusChanged) {
        this._status = event.status;
    }
}
