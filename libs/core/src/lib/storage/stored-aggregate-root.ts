/**
 * Defines a simple representation of an aggregate root that is persisted. This information needs to be persisted so
 * that we can always have a way of knowing what is the current version of the aggregate root object.
 */
export class StoredAggregateRoot {
    constructor(public id: string, public version: number) {}
}
