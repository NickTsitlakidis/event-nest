import { DomainEvent } from "@event-nest/core";

import { OrderModel } from "./order";

@DomainEvent("order-created")
export class OrderCreatedEvent {
    constructor(public userId: string) {}
}

@DomainEvent("order-status-changed")
export class OrderStatusChanged {
    constructor(public status: OrderModel["status"]) {}
}
