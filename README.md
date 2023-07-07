# Event Nest
A set of [nest.js](https://nestjs.com/) libraries to help you build applications based on event sourcing architecture.

## Description
Event Nest is a collection of libraries based on nest.js that assists in implementing the core concepts of event sourcing: : 
* Saving events in a persistent storage
* Utilizing the saved events to trigger side effects, such as updating your read model
* Replaying events to reconstruct the state of your application

Given that event sourcing is commonly used in conjunction with [CQRS](https://martinfowler.com/bliki/CQRS.html) and [Domain Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design), these libraries adopt principles from these architectural patterns.

It would also probably help to make some distinctions about what Event Nest is not : 
* It is not a framework, it is a set of libraries which are designed to be used with nest.js.
* It is not an ORM, if you want an ORM to define simple models, there are far better solutions out there.
* It is not a library for establishing event-based communication between services.

## Why?
Implementing event sourcing in an application can be challenging, particularly when combined with CQRS and DDD.

Nest.js provides a [fantastic module](https://github.com/nestjs/cqrs) for CQRS but after using it for a while I thought that maybe some things could be improved.
Furthermore, these improvements can't be added to the official module due to its lightweight and abstract nature. For instance, the official module lacks a way
of persisting events using storage technology. 

This is where Event Nest comes into play. In fact, a significant portion of the code in Event Nest is influenced by how things are implemented in the official module.

This project evolved into a library after I used the official module with my improvements in a few projects and I thought that it could be useful to other people. To make things
simpler, the library is not depending on the official module, so you can use it without having to worry about conflicts.

## Getting Started
Depending on the storage solution you intend to use, you will need to install the corresponding packages.
At the moment, only MongoDB is implemented, hopefully soon there will be more.

```bash
npm install --save @event-nest/core @event-nest/mongodb
```

## Concepts

## Contributing

## License

