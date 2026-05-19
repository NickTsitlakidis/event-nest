import { Body, Controller, Param, Post, Put } from "@nestjs/common";

import { OrderService } from "./order.service";

@Controller("order")
export class OrderController {
    constructor(private orderService: OrderService) {}

    @Post()
    createOrder(@Body() requestBody: { userId: string }) {
        return this.orderService.createOrder(requestBody.userId);
    }

    @Put(":id")
    updateOrder(@Body() requestBody: { newStatus: "paid" | "pending" | "shipping" }, @Param("id") id: string) {
        return this.orderService.updateOrder(id, requestBody.newStatus);
    }
}
