# Event Nest
A collection of [NestJS](https://nestjs.com/) libraries to help you build applications based on event-sourcing architecture.

![build status](https://github.com/NickTsitlakidis/event-nest/actions/workflows/checks.yml/badge.svg)
[![npm version](https://badge.fury.io/js/@event-nest%2Fcore.svg)](https://badge.fury.io/js/@event-nest%2Fcore)
[![Coverage Status](https://coveralls.io/repos/github/NickTsitlakidis/event-nest/badge.svg?branch=master)](https://coveralls.io/github/NickTsitlakidis/event-nest?branch=master)

## Description
Event Nest simplifies the implementation of event-sourcing patterns in NestJS applications by providing tools to manage events, aggregates, and domain subscriptions. It helps developers focus on business logic by addressing common challenges in event sourcing, such as event persistence, replay, and projection updates.

Event sourcing is commonly used alongside [CQRS](https://martinfowler.com/bliki/CQRS.html) and [Domain Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design). Event Nest incorporates principles from these architectural patterns to provide robust support for scalable application development.

What Event Nest is Not:
* **Not a framework**: It is a set of libraries which are designed to be used with NestJS.
* **Not an ORM**: If your primary goal is managing simple database models, more appropriate solutions exist.
* **Not for event-based communication**: It is not a library for establishing event-based communication between services.
* **Not widely tested in production**: While the code is covered by tests, extensive production testing has not yet been conducted. Use it at your own risk.

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
        - [Order of execution in subscriptions](#order-of-execution-in-subscriptions)
        - [Waiting for subscriptions to complete](#waiting-for-subscriptions-to-complete)


## Why?
Implementing event sourcing in an application can be challenging, particularly when combined with CQRS and Domain-Driven Design.

While NestJS provides a [fantastic module](https://github.com/nestjs/cqrs) for CQRS, its lightweight and abstract design leaves gaps in areas such as event persistence.

Event Nest bridges these gaps by providing:
* A structured way to persist events.
* Seamless integration with NestJS.
* Tools to manage aggregates and replay events.

The library emerged from using the official CQRS module in various projects, where practical enhancements and improvements were made to address real-world challenges.
A significant portion of the code in Event Nest is inspired by the patterns implemented in the official NestJS module.


## Getting Started
Depending on the storage solution you intend to use, you will need to install the corresponding packages.
Currently supported options are MongoDB and PostgreSQL.

### MongoDB setup

```bash
npm install --save @event-nest/core @event-nest/mongodb
```
After installation, import the `EventNestMongoDbModule` to your NestJS application :
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
The collections specified in the configuration will store the aggregates and events.


### PostgreSQL setup

```bash
npm install --save @event-nest/core @event-nest/postgresql
```

After installation, import the `EventNestPostgreSQLModule` to your NestJS application :
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

If the database user has privileges to create tables, set the `ensureTablesExist` option to true to automatically create the necessary tables during bootstrap. Otherwise, refer to the manual table creation instructions below.


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
* It will be saved to the database because it represents a change in the state of the system
* It will be passed to any internal subscriptions that need to react to this event (e.g. updating the read model)
* When it's time to reconstruct the state of an aggregate root, the events will be replayed in the order they were created.

There is no specific requirement for the structure of an event, but it is recommended to keep it simple and immutable. The [class-transformer](https://github.com/typestack/class-transformer) library is utilized under the hood to save and read the events from the database. Therefore, your event classes should adhere to the rules of class-transformer to be properly serialized and deserialized.

To register a class as an event, use the `@DomainEvent` decorator. The decorator accepts a string parameter which is the unique name of the event.


### Aggregate Root
An [aggregate root](https://stackoverflow.com/questions/1958621/whats-an-aggregate-root) is a fundamental concept in Domain-Driven Design (DDD).
It represents a cluster of domain objects that are treated as a single unit. The aggregate root is responsible for maintaining the consistency and enforcing business rules within the aggregate.

In the context of event sourcing, the aggregate root plays a crucial role. Each aggregate root maintains its own set of events, forming an event stream.
These events capture the changes or actions that have occurred within the aggregate. The event stream serves as the historical record of what has happened to the aggregate over time.

Let's consider an example to illustrate the concept of an aggregate root. Suppose we have a user management system where we need to create new users and update existing users. In this case, the `User` entity serves as the aggregate root.

The `User` class encapsulates the user-specific behavior and maintains the internal state of a user. It provides methods for creating a new user, updating user details, and performing any other operations relevant to the user domain. These methods are called from NestJS services or other parts of the application responsible for user-related operations.

Each instance of the `User` class has its own event stream, which records the events specific to that user. For example, when a new user is created, an event called `UserCreatedEvent` is appended to the event stream. Similarly, when a user's details are updated, an event called `UserUpdatedEvent` is appended.

When loading a user from the event store, the event stream is replayed, and each event is processed by the corresponding method in the `User` class. This allows the user object to be reconstructed and updated to its most recent state based on the events.

To ensure that all modifications to the user's state are properly recorded, any method that changes the state should also append the corresponding event to the event stream.


#### Example

We'll start with this example by defining two simple events for a user: a creation event and an update event. Each one has its own data, and they are identified by a unique name which is set with the `@DomainEvent` decorator.


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

Next, we will define the aggregate root for the user. Let's break down what this class should do and how.

First of all, the class has to extend the `AggregateRoot` class, and it has to be decorated with the `@AggregateRootName` decorator.
The name is required to associate persisted events with the correct aggregate root when retrieving them from storage.

Now let's talk about constructors. TypeScript doesn't allow us to define multiple constructors. Therefore, if we have two ways of creating an object, we could use static methods as factories.
In our case, we have the following creation cases :
* The user is new, and we need to create it from scratch. In that case, we create a new `UserCreatedEvent` event, and we `append` it to the aggregate root's event stream.
* The user already exists. In that case we need to recreate the aggregate root from the events that have been persisted. We do that by calling the `reconstitute` method.

The `reconstitute` method will use the provided events to find and call the appropriate method that updates the state for each specific event.
These methods should be decorated with the `@ApplyEvent` decorator, which takes the event class as a parameter.


Finally, we will define an `update` method which is the place to run any business logic we need and append the corresponding event (`UserUpdatedEvent`) to the event stream.

It's important to note that the append method will not save the event. All the appended events can be saved by calling the `commit` method on the aggregate root.


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

The final piece of the puzzle is a NestJS service that will orchestrate the process.

We start by injecting the `EventStore`, which will be used to retrieve persisted events.

The next step would be to make the aggregate root be aware of the event store. This is required because aggregate root classes are not managed by the NestJS dependency injection system.
The `EventStore` includes a method called `addPublisher` that takes an aggregate root and updates it by connecting it to the event store.

Finally, we will call the `commit` method on the aggregate root to save the appended events to the storage.

```typescript
import { EVENT_STORE, EventStore } from "@event-nest/core";

@Injectable()
export class UserService {
    constructor(@Inject(EVENT_STORE) private eventStore: EventStore) {}

    async createUser(name: string, email: string) {
        const user = User.createNew('a-unique-id', name, email);
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

### Domain Event Subscription
When working with event sourcing, you will often need to update other parts of your system after an event has been persisted. For example, you may have a read model for users that needs to be updated when a user is created or updated. Or, perhaps you need to send an email notification when a specific event occurs.

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
#### Order of execution in subscriptions

If there are multiple subscriptions for the same event, they will be executed concurrently.
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

#### Waiting for subscriptions to complete

By default, the `commit` method on the aggregate root will return a promise that resolves when the events are saved to the storage. It will not wait for the subscriptions to complete.
This is the most common requirement in event-sourcing systems, as the subscriptions are usually used for updating the read model and are not critical for the operation of the system.

However, there are use cases that require the subscriptions to complete before the `commit` method returns a result.

The `DomainEventSubscription` decorator supports an alternative syntax for those cases :

```typescript

@DomainEventSubscription({ eventClasses: [UserCreatedEvent, UserUpdatedEvent], isAsync: false })

```
When your subscription is defined like this, the `commit` method will not return until the `onDomainEvent` method is completed for all the events that the service is subscribed to.

If your subscription throws an exception, the exception will be wrapped in a `SubscriptionException` which will be thrown by the `commit` method.
It's important to note that when the `commit` method throws such an exception, it doesn't mean that the events were not saved to the storage. Since the subscriptions run after the events are saved, an exception from a subscription doesn't roll back the events.


## License
Event Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

