import { DomainEventSubscription, OnDomainEvent, PublishedDomainEvent } from "@event-nest/core";
import { Injectable } from "@nestjs/common";

import { UserCreatedEvent, UserUpdatedEvent } from "./user-events";

@DomainEventSubscription(UserCreatedEvent, UserUpdatedEvent)
@Injectable()
export class UserEventSubscription implements OnDomainEvent<UserCreatedEvent | UserUpdatedEvent> {
    onDomainEvent(event: PublishedDomainEvent<UserCreatedEvent | UserUpdatedEvent>): Promise<unknown> {
        //Here you can create/update your read model based on the event and your custom logic.
        console.log(event);
        return Promise.resolve(undefined);
    }
}
