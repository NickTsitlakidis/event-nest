import { EVENT_STORE, EventStore } from "@event-nest/core";
import { Inject, Injectable } from "@nestjs/common";
import { ObjectId } from "mongodb";

import { User } from "./user";

@Injectable()
export class UserService {
    constructor(@Inject(EVENT_STORE) private readonly _eventStore: EventStore) {}

    async createUser(name: string, email: string) {
        const user = User.createNew(new ObjectId().toHexString(), name, email);
        const userWithPublisher = this._eventStore.addPublisher(user);
        await userWithPublisher.commit();
        return user.id;
    }

    async updateUser(id: string, newName: string) {
        const events = await this._eventStore.findByAggregateRootId(User, id);
        const user = User.fromEvents(id, events);
        const userWithPublisher = this._eventStore.addPublisher(user);
        user.update(newName);
        await userWithPublisher.commit();
    }
}
