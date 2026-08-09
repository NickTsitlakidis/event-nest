import { SchemaConfiguration } from "./schema-configuration";

describe("SchemaConfiguration", () => {
    test("exposes schema-qualified table names", () => {
        const configuration = new SchemaConfiguration("event_nest", "aggregates", "events", "snapshots");

        expect(configuration.schemaAwareAggregatesTable).toBe("event_nest.aggregates");
        expect(configuration.schemaAwareEventsTable).toBe("event_nest.events");
        expect(configuration.schemaAwareSnapshotTable).toBe("event_nest.snapshots");
    });

    test.each(["", "schema.table", "x".repeat(129)])("rejects invalid identifiers: %s", (identifier) => {
        expect(() => new SchemaConfiguration(identifier, "aggregates", "events")).toThrow();
    });
});
