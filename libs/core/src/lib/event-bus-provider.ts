import { Provider } from "@nestjs/common";
import { CoreModuleOptions } from "./core-module-options";
import { EventBus } from "./event-bus";

export function provideEventBus(options: CoreModuleOptions): Provider {
    return {
        provide: EventBus,
        useFactory: () => {
            return new EventBus(options.runParallelSubscriptions);
        }
    };
}
