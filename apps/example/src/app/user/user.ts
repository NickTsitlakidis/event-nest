import { AggregateRoot, AggregateRootConfig, ApplyEvent, SnapshotAware, StoredEvent } from "@event-nest/core";

import { UserCreatedEvent, UserUpdatedEvent } from "./user-events";

interface UserModel {
    email: string;
    name: string;
}

@AggregateRootConfig({ name: "User", snapshotRevision: 1 })
export class User extends AggregateRoot implements SnapshotAware<UserModel> {
    private _email: string;
    private _name: string;

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

    applySnapshot(snapshot: { email: string; name: string }) {
        this._email = snapshot.email;
        this._name = snapshot.name;
    }

    toSnapshot() {
        return {
            email: this._email,
            name: this._name
        };
    }

    public update(newName: string) {
        const event = new UserUpdatedEvent(newName);
        this.processUserUpdatedEvent(event);
        this.append(event);
    }

    @ApplyEvent(UserCreatedEvent)
    private processUserCreatedEvent(event: UserCreatedEvent) {
        console.log(this);
        this._name = event.name;
        this._email = event.email;
    }

    @ApplyEvent(UserUpdatedEvent)
    private processUserUpdatedEvent(event: UserUpdatedEvent) {
        this._name = event.newName;
    }
}
