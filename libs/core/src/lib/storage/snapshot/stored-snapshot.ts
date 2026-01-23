/**
 * Represents a snapshot of an aggregate root's state at a specific point in time.
 */
export class StoredSnapshot<T = unknown> {
    readonly _id: string;
    private _aggregateRootId!: string;
    private _aggregateRootVersion!: number;
    private _payload!: T;
    private _revision!: number;

    private constructor(id: string) {
        this._id = id;
    }

    static create(
        id: string,
        aggregateRootVersion: number,
        revision: number,
        payload: unknown,
        aggregateRootId: string
    ): StoredSnapshot {
        const snapshot = new StoredSnapshot(id);
        snapshot._aggregateRootVersion = aggregateRootVersion;
        snapshot._payload = payload;
        snapshot._revision = revision;
        snapshot._aggregateRootId = aggregateRootId;

        return snapshot;
    }

    get aggregateRootId() {
        return this._aggregateRootId;
    }

    get aggregateRootVersion() {
        return this._aggregateRootVersion;
    }

    get id() {
        return this._id;
    }

    get payload(): T {
        return this._payload;
    }

    get revision() {
        return this._revision;
    }
}
