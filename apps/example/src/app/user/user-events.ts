import { DomainEvent } from "@event-nest/core";

@DomainEvent("user-created-event")
export class UserCreatedEvent {
    constructor(public name: string, public email: string) {}
}

@DomainEvent("user-updated-event")
export class UserUpdatedEvent {
    constructor(public newName: string) {}
}
