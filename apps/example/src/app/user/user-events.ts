import { RegisteredEvent } from "@event-nest/core";

@RegisteredEvent("user-created-event")
export class UserCreatedEvent {
    constructor(public name: string, public email: string) {}
}

@RegisteredEvent("user-updated-event")
export class UserUpdatedEvent {
    constructor(public newName: string) {}
}
