import { AggregateRootEvent, DomainEventSubscription, OnDomainEvent } from "@event-nest/core";
import { UserCreatedEvent, UserUpdatedEvent } from "./user-events";
import { Injectable } from "@nestjs/common";

@Injectable()
@DomainEventSubscription(UserCreatedEvent, UserUpdatedEvent)
export class UserEventSubscription implements OnDomainEvent<UserCreatedEvent | UserUpdatedEvent> {
    onDomainEvent(event: AggregateRootEvent<UserCreatedEvent | UserUpdatedEvent>): Promise<unknown> {
        //Here you can create/update your read model based on the event and your custom logic.
        console.log(event);
        return Promise.resolve(undefined);
    }
}
