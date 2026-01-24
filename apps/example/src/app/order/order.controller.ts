import { Body, Controller, Param, Post, Put } from "@nestjs/common";

import { OrderService } from "./order.service";

@Controller("order")
export class OrderController {
    constructor(private orderService: OrderService) {}

    @Post()
    createUser(@Body() requestBody) {
        return this.orderService.createOrder(requestBody.name, requestBody.userId);
    }

    @Put(":id")
    updateUser(@Body() requestBody, @Param("id") id: string) {
        return this.orderService.updateOrder(id, requestBody.newStatus);
    }
}
