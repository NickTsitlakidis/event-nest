/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NodeAdapter } from "@nestjs/platform-node";

import { AppModule } from "./app/app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, new NodeAdapter());
    const globalPrefix = "api";
    app.setGlobalPrefix(globalPrefix);
    const port = process.env.PORT || 3000;
    await app.listen(port);
    Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
