# Event Nest
A collection of [nest.js](https://nestjs.com/) libraries to help you build applications based on event sourcing architecture.

![build status](https://github.com/NickTsitlakidis/event-nest/actions/workflows/checks.yml/badge.svg)
[![npm version](https://badge.fury.io/js/@event-nest%2Fcore.svg)](https://badge.fury.io/js/@event-nest%2Fcore)
[![Coverage Status](https://coveralls.io/repos/github/NickTsitlakidis/event-nest/badge.svg?branch=master)](https://coveralls.io/github/NickTsitlakidis/event-nest?branch=master)

## Description
Event Nest is a collection of libraries based on nest.js that assists in implementing the core concepts of event sourcing:
* Saving events in a persistent storage
* Utilizing the saved events to trigger side effects, such as updating your read model
* Replaying events to reconstruct the state of your application

Given that event sourcing is commonly used in conjunction with [CQRS](https://martinfowler.com/bliki/CQRS.html) and [Domain Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design), these libraries adopt principles from these architectural patterns.

It would also probably help to make some distinctions about what Event Nest is not :
* It is not a framework, it is a set of libraries which are designed to be used with nest.js.
* It is not an ORM, if you want an ORM to define simple models, there are far better solutions out there.
* It is not a library for establishing event-based communication between services.
* **Although the code is covered by tests, the library is not widely tested in production. Use it at your own risk.**

## Table of contents
- [Why?](#why)
- [Getting Started](#getting-started)
    - [MongoDB setup](#mongodb-setup)
    - [PostgreSQL setup](#postgresql-setup)
        - [Manual creation of PostgreSQL tables](#manual-creation-of-postgresql-tables)
- [Concepts](#concepts)
    - [Event](#event)
    - [Aggregate Root](#aggregate-root)
    - [Domain Event Subscription](#domain-event-subscription)


## Why?
Implementing event sourcing in an application can be challenging, particularly when combined with CQRS and DDD.

Nest.js provides a [fantastic module](https://github.com/nestjs/cqrs) for CQRS but after using it for a while I thought that maybe some things could be improved.
Furthermore, these improvements can't be added to the official module due to its lightweight and abstract nature.
For instance, the official module lacks a specific way of persisting the events to a storage.

This is where Event Nest comes into play. In fact, a significant portion of the code in Event Nest is influenced by how things are implemented in the official module.

This project evolved into a library after I used the official module with my improvements in a few projects and I thought that it could be useful to other people. To make things
simpler, the library is not depending on the official module, so you can use it without having to worry about conflicts.

## Getting Started
Depending on the storage solution you intend to use, you will need to install the corresponding packages.
At the moment, the supported storage solutions are MongoDB and PostgreSQL.

### MongoDB setup

```bash
npm install --save @event-nest/core @event-nest/mongodb
```
After installation, import the `EventNestMongoDbModule` to your nest.js application :
```typescript
import { EventNestMongoDbModule } from "@event-nest/mongodb";
import { Module } from "@nestjs/common";

@Module({
    imports: [
        EventNestMongoDbModule.forRoot({
            connectionUri: "mongodb://localhost:27017/example",
            aggregatesCollection: "aggregates-collection",
            eventsCollection: "events-collection"
        }),
    ],
})
export class AppModule {}
```
The collection settings define which MongoDB collections will be used to store the aggregates and the events.


### PostgreSQL setup

```bash
npm install --save @event-nest/core @event-nest/postgresql
```

After installation, import the `EventNestPostgreSQLModule` to your nest.js application :
```typescript
import { EventNestPostgreSQLModule } from "@event-nest/postgresql";
import { Module } from "@nestjs/common";

@Module({
    imports: [
        EventNestPostgreSQLModule.forRoot({
            aggregatesTableName: "aggregates",
            connectionUri: "postgresql://postgres:password@localhost:5432/event_nest",
            eventsTableName: "events",
            schemaName: "event_nest_schema",
            ensureTablesExist: true
        })
    ]
})
export class AppModule {}
```

If the database user has privileges to create tables, you can set the `ensureTablesExist` option to `true`. This will create the necessary tables in your database during application bootstrap.
By default, this option is disabled to avoid requiring a user with elevated privileges.



#### Manual creation of PostgreSQL tables
If you prefer to create the tables manually, the following guidelines describe the structure of the tables that need to be created.

**Aggregates Table :**

| Column Name | Type    | Description                                                                                                 |
|-------------|---------|-------------------------------------------------------------------------------------------------------------|
| id          | uuid    | The unique identifier of the aggregate root. <br/>Must be set as NOT NULL and it is the table's primary key |
| version     | integer | The current version of the aggregate root. <br/>Must be set as NOT NULL                                     |

**Events Table :**

| Column Name            | Type                     | Description                                                                                                                   |
|------------------------|--------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| id                     | uuid                     | The unique identifier of the event. <br/>Must be set as NOT NULL and it is the table's primary key                            |
| aggregate_root_id      | uuid                     | The id of the aggregate that produced the event.<br/> Must be set as NOT NULL and it is a foreign key to the aggregates table |
| aggregate_root_version | integer                  | The version of the aggregate root when the event was produced. <br/>Must be set as NOT NULL                                   |
| aggregate_root_name    | text                     | The unique name of the aggregate root. <br/>Must be set as NOT NULL                                                           |
| event_name             | text                     | The unique name of the event. <br/>Must be set as NOT NULL                                                                    |
| payload                | jsonb                    | A JSON representation of the event's additional data.                                                                         |
| created_at             | timestamp with time zone | The timestamp when the event was produced. <br/>Must be set as NOT NULL                                                       |


## Concepts
### Event
An event is a representation of something that has happened in the past. It is identified by a unique name, and it may contain additional data that will be persisted with the event.

Each event serves three purposes :
* It will be persisted so that it can be used to reconstruct the state of an aggregate root
* It will be passed to any internal subscribers that need to react to this event (e.g. updating the read model)
* When it's time to recreate the aggregate root, the event will be applied by the correct method in the aggregate root

There is no specific requirement for the structure of an event, but it is recommended to keep it simple and immutable. The [class-transformer](https://github.com/typestack/class-transformer) library is utilized under the hood to save and read the events from the database. Therefore, your event classes should adhere to the rules of class-transformer to be properly serialized and deserialized.

To register a class as an event, use the `@DomainEvent` decorator. The decorator accepts a string parameter which is the unique name of the event.


### Aggregate Root
An [aggregate root](https://stackoverflow.com/questions/1958621/whats-an-aggregate-root) is a fundamental concept in Domain-Driven Design (DDD).
It represents a cluster of domain objects that are treated as a single unit. The aggregate root is responsible for maintaining the consistency and enforcing business rules within the aggregate.
While explaining the concept of an aggregate root in depth is beyond the scope of this documentation, it's important to understand how such an object interacts with the event sourcing system.

In the context of event sourcing, the aggregate root plays a crucial role. Each aggregate root maintains its own set of events, forming an event stream.
These events capture the changes or actions that have occurred within the aggregate. The event stream serves as the historical record of what has happened to the aggregate over time.

Let's consider an example to illustrate the concept of an aggregate root. Suppose we have a user management system where we need to create new users and update existing users. In this case, the `User` entity serves as the aggregate root.

The `User` class encapsulates the user-specific behavior and maintains the internal state of a user. It provides methods for creating a new user, updating user details, and performing any other operations relevant to the user domain. These methods are called from Nest.js services or other parts of the application responsible for user-related operations.

Each instance of the `User` class has its own event stream, which records the events specific to that user. For example, when a new user is created, an event called `UserCreatedEvent` is appended to the event stream. Similarly, when a user's details are updated, an event called `UserUpdatedEvent` is appended.

When loading a user from the event store, the event stream is replayed, and each event is processed by the corresponding method in the `User` class. This allows the user object to be reconstructed and updated to its most recent state based on the events.

To ensure that all modifications to the user's state are properly recorded, any method that changes the state should also append the corresponding event to the event stream. By doing so, the event is persisted and can be used for reconstructing the state in the future.
If an event is not appended, the changes will not be saved in the database, and the consistency of the user object will be compromised.


Enough with the theory, let's see an example that includes all of the above.

#### Example

```typescript
import { DomainEvent } from "@event-nest/core";

@DomainEvent("user-created-event")
export class UserCreatedEvent {
    constructor(public name: string, public email: string) {}
}
```

```typescript
import { DomainEvent } from "@event-nest/core";

@DomainEvent("user-updated-event")
export class UserUpdatedEvent {
    constructor(public newName: string) {}
}
```

We start this example by defining two simple events for a user: a creation event and an update event. Each one has its own data, and they are identified by a unique name which is set with the `@DomainEvent` decorator.

```typescript
import { AggregateRoot, AggregateRootName, ApplyEvent, StoredEvent } from "@event-nest/core";

@AggregateRootName("User")
export class User extends AggregateRoot {
    private name: string;
    private email: string;

    private constructor(id: string) {
        super(id);
    }
    
    public static createNew(id: string, name: string, email: string): User {
        const user = new User(id);
        const event = new UserCreatedEvent(name, email);
        user.applyUserCreatedEvent(event);
        user.append(event);
        return user;
    }

    public static fromEvents(id: string, events: Array<StoredEvent>): User {
        const user = new User(id);
        user.reconstitute(events);
        return user;
    }

    public update(newName: string) {
        const event = new UserUpdatedEvent(newName);
        this.applyUserUpdatedEvent(event);
        this.append(event);
    }

    @ApplyEvent(UserCreatedEvent)
    private applyUserCreatedEvent(event: UserCreatedEvent) {
        this.name = event.name;
        this.email = event.email;
    }

    @ApplyEvent(UserUpdatedEvent)
    private applyUserUpdatedEvent(event: UserUpdatedEvent) {
        this.name = event.newName;
    }
    
}
```

Next, we define the aggregate root for the user. There's a lot going on here so let's break it down.

First of all, the class has to extend the `AggregateRoot` class, and it has to be decorated with the `@AggregateRootName` decorator.
The name is required to associate persisted events with the correct aggregate root when retrieving them from storage.

Now let's talk about the constructor. TypeScript doesn't allow us to define multiple constructors. So if we have two ways of creating an object, we could use static methods as factories.
In our case, we have the following creation cases :
* The user is new, and we need to create it from scratch. In that case, we create a new `UserCreatedEvent` event, and we `append` it to the aggregate root's event stream.
* The user already exists. In that case we need to recreate the aggregate root from the events that have been persisted. We do that by calling the `reconstitute` method.

The `reconstitute` method will initiate the event processing based on the events order.

To apply each event, we have defined two private methods which are decorated with the `@ApplyEvent` decorator. Each method will be called when the corresponding event is retrieved, and it's ready to be processed.
This is the place to update the object's internal state based on the event's data.


Finally, we define an `update` method which is the place to run any business logic we need and append the corresponding event (`UserUpdatedEvent`) to the event stream.

It's important to note that the append method is not saving the event. All the appended events can be saved by calling the `commit` method on the aggregate root.

```typescript
import { EVENT_STORE, EventStore } from "@event-nest/core";

@Injectable()
export class UserService {
    constructor(@Inject(EVENT_STORE) private eventStore: EventStore) {}

    async createUser(name: string, email: string) {
        const user = User.createNew(new ObjectId().toHexString(), name, email);
        const userWithPublisher = this.eventStore.addPublisher(user);
        await userWithPublisher.commit();
        return user.id;
    }

    async updateUser(id: string, newName: string) {
        const events = await this.eventStore.findByAggregateRootId(User, id);
        const user = User.fromEvents(id, events);
        const userWithPublisher = this.eventStore.addPublisher(user);
        user.update(newName);
        await userWithPublisher.commit();
    }
}
```

The final piece of the puzzle is a nest.js service that will manage the process.

We start by injecting the `EventStore`, which will be used to retrieve persisted events.

Additionally, since the aggregate root classes are not managed by the nest.js dependency injection system, we need to connect them to the event store by calling the `addPublisher` method. This will allow the
`commit` method to work as expected.

### Domain Event Subscription
When working with event sourcing, you will likely need a way of updating other parts of your system when an event is persisted. For example, you may have a read model for users that needs to be updated when a user is created or updated.

To achieve this, you can implement a service decorated with the `@DomainEventSubscription` decorator. This decorator takes a list of events that the service is interested in, and it automatically subscribes to them when the service is initialized.

To ensure that the method is implemented correctly, you can use the `OnDomainEvent` interface.

#### Example

```typescript
import { PublishedDomainEvent, DomainEventSubscription, OnDomainEvent } from "@event-nest/core";

@Injectable()
@DomainEventSubscription(UserCreatedEvent, UserUpdatedEvent)
export class UserEventSubscription implements OnDomainEvent<UserCreatedEvent | UserUpdatedEvent> {

    onDomainEvent(event: PublishedDomainEvent<UserCreatedEvent | UserUpdatedEvent>): Promise<unknown> {
        //Here you can create/update your read model based on the event and your custom logic.
        return Promise.resolve(undefined);
    }

}
```

If there are multiple subscription services for the same event, they will be executed concurrently.
However, if there are multiple events that the service is subscribed to, they will be executed sequentially based on the order they were emitted.

This is the default behaviour because there are cases where the logic may depend on the completion of the previous event. If you want better performance
and your logic doesn't depend on the order of the events, you can change this setting when you import the module.

```typescript
@Module({
    imports: [
        EventNestMongoDbModule.forRoot({
            connectionUri: "mongodb://localhost:27017/example",
            aggregatesCollection: "aggregates-collection",
            eventsCollection: "events-collection",
            concurrentSubscriptions:true
        })
    ]
})
export class AppModule {}
```



## License
Event Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

