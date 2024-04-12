import { AggregateRoot, AggregateRootName, EventProcessor, StoredEvent } from "@event-nest/core";

import { UserCreatedEvent, UserUpdatedEvent } from "./user-events";

@AggregateRootName("User")
export class User extends AggregateRoot {
    private _email: string;
    private _name: string;

    @EventProcessor(UserCreatedEvent)
    private processUserCreatedEvent = (event: UserCreatedEvent) => {
        this._name = event.name;
        this._email = event.email;
    };

    @EventProcessor(UserUpdatedEvent)
    private processUserUpdatedEvent = (event: UserUpdatedEvent) => {
        this._name = event.newName;
    };

    private constructor(id: string) {
        super(id);
    }

    public static createNew(id: string, name: string, email: string): User {
        const user = new User(id);
        const event = new UserCreatedEvent(name, email);
        user.processUserCreatedEvent(event);
        user.append(event);
        return user;
    }

    public static fromEvents(id: string, events: Array<StoredEvent>): User {
        const user = new User(id);
        user.reconstitute(events);
        return user;
    }

    get email(): string {
        return this._email;
    }

    public get name(): string {
        return this._name;
    }

    public update(newName: string) {
        const event = new UserUpdatedEvent(newName);
        this.processUserUpdatedEvent(event);
        this.append(event);
    }
}
