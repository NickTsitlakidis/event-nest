import { Body, Controller, Param, Post, Put } from "@nestjs/common";

import { UserService } from "./user/user.service";

@Controller("users")
export class AppController {
    constructor(private readonly appService: UserService) {}

    @Post()
    createUser(@Body() requestBody) {
        return this.appService.createUser(requestBody.name, requestBody.email);
    }

    @Put(":id")
    updateUser(@Body() requestBody, @Param("id") id: string) {
        return this.appService.updateUser(id, requestBody.name);
    }
}
