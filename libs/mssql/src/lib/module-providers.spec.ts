const mockedKnex = jest.fn().mockReturnValue({});
jest.mock("knex", () => ({ knex: mockedKnex }));

import {
    DomainEventEmitter,
    EVENT_STORE,
    ForCountSnapshotStrategy,
    NoOpSnapshotStore,
    SNAPSHOT_STORE
} from "@event-nest/core";
import { Test } from "@nestjs/testing";

import { ModuleProviders } from "./module-providers";
import { MSSQLModuleOptions } from "./mssql-module-options";
import { MSSQLEventStore } from "./storage/mssql-event-store";
import { MSSQLSnapshotStore } from "./storage/mssql-snapshot-store";
import { TableInitializer } from "./table-initializer";

describe("ModuleProviders", () => {
    beforeEach(() => mockedKnex.mockReturnValue({}));

    test("creates the event store, emitter, no-op snapshot store, and initializer", async () => {
        const options = createOptions({ concurrentSubscriptions: true, ensureTablesExist: true });
        const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();

        expect(module.get(EVENT_STORE)).toBeInstanceOf(MSSQLEventStore);
        expect(module.get(SNAPSHOT_STORE)).toBeInstanceOf(NoOpSnapshotStore);
        expect(module.get(DomainEventEmitter).concurrentSubscriptions).toBe(true);
        expect(module.get(TableInitializer).ensureTablesExist).toBe(true);
    });

    test("creates the MSSQL snapshot store when snapshots are configured", async () => {
        const options = createOptions({
            snapshotStrategy: new ForCountSnapshotStrategy({ count: 5 }),
            snapshotTableName: "snapshots"
        });
        const module = await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();

        expect(module.get(SNAPSHOT_STORE)).toBeInstanceOf(MSSQLSnapshotStore);
    });

    test("supports asynchronous options", async () => {
        const module = await Test.createTestingModule({
            providers: ModuleProviders.createAsync({ useFactory: async () => createOptions() })
        }).compile();

        expect(module.get(EVENT_STORE)).toBeInstanceOf(MSSQLEventStore);
    });

    test("rejects either incomplete snapshot configuration", async () => {
        await expect(
            Test.createTestingModule({
                providers: ModuleProviders.create({
                    ...createOptions(),
                    snapshotStrategy: new ForCountSnapshotStrategy({ count: 5 })
                } as MSSQLModuleOptions)
            }).compile()
        ).rejects.toThrow("both 'snapshotStrategy' and 'snapshotTableName'");
        await expect(
            Test.createTestingModule({
                providers: ModuleProviders.create({
                    ...createOptions(),
                    snapshotTableName: "snapshots"
                } as MSSQLModuleOptions)
            }).compile()
        ).rejects.toThrow("both 'snapshotStrategy' and 'snapshotTableName'");
    });

    test("rejects port and instanceName together", () => {
        expect(() =>
            ModuleProviders.create(
                createOptions({ connection: { ...createOptions().connection, instanceName: "SQLEXPRESS", port: 1433 } })
            )
        ).toThrow("both 'port' and 'instanceName'");
    });

    test("maps structured options to secure Knex defaults", async () => {
        const options = createOptions({
            connection: {
                ...createOptions().connection,
                connectionTimeout: 4000,
                requestTimeout: 9000,
                serverName: "sql.example.test"
            },
            connectionPool: { max: 8 }
        });

        await Test.createTestingModule({ providers: ModuleProviders.create(options) }).compile();

        expect(mockedKnex).toHaveBeenCalledWith({
            client: "mssql",
            connection: {
                connectionTimeout: 4000,
                database: "event_nest",
                options: {
                    encrypt: true,
                    instanceName: undefined,
                    lowerCaseGuids: true,
                    mapBinding: expect.any(Function),
                    serverName: "sql.example.test",
                    trustServerCertificate: false,
                    useUTC: true
                },
                password: "Password!123",
                port: 1433,
                requestTimeout: 9000,
                server: "localhost",
                user: "sa"
            },
            pool: { max: 8, min: 0 }
        });
    });
});

function createOptions(overrides: Partial<MSSQLModuleOptions> = {}): MSSQLModuleOptions {
    return {
        aggregatesTableName: "aggregates",
        connection: {
            database: "event_nest",
            password: "Password!123",
            port: 1433,
            server: "localhost",
            user: "sa"
        },
        eventsTableName: "events",
        schemaName: "dbo",
        ...overrides
    } as MSSQLModuleOptions;
}
