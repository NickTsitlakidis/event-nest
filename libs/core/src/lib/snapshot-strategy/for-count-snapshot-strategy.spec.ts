import { createMock } from "@golevelup/ts-jest";

import { AggregateRoot } from "../aggregate-root/aggregate-root";
import { DomainEvent } from "../domain-event";
import { ForCountSnapshotStrategy } from "./for-count-snapshot-strategy";

@DomainEvent("TestEvent")
class TestEvent {}

describe("ForCountSnapshotStrategy", () => {
    describe("constructor", () => {
        test("throws error when count is less than 1", () => {
            expect(() => new ForCountSnapshotStrategy({ count: 0 })).toThrow();
            expect(() => new ForCountSnapshotStrategy({ count: -1 })).toThrow();
        });
    });

    describe("shouldCreateSnapshot=true", () => {
        test("returns true when one event reach threshold", () => {
            const aggregateRoot = createMock<AggregateRoot>({
                uncommittedEvents: [
                    {
                        payload: new TestEvent()
                    }
                ],
                version: 9
            });

            const strategy = new ForCountSnapshotStrategy({ count: 10 });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });

        test("returns true when multiple events reach exact treshold", () => {
            const count = 5;
            const aggregateRoot = createMock<AggregateRoot>({
                uncommittedEvents: Array.from({ length: count }, () => ({
                    payload: new TestEvent()
                })),
                version: 5
            });

            const strategy = new ForCountSnapshotStrategy({ count });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });

        test("returns true when crossing threshold with multiple events", () => {
            const count = 5;
            const aggregateRoot = createMock<AggregateRoot>({
                uncommittedEvents: Array.from({ length: count * 2 }, () => ({
                    payload: new TestEvent()
                })),
                version: 5
            });

            const strategy = new ForCountSnapshotStrategy({ count });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(true);
        });
    });

    describe("shouldCreateSnapshot=false", () => {
        test("returns false when no uncommitted events", () => {
            const aggregateRoot = createMock<AggregateRoot>({
                uncommittedEvents: [],
                version: 0
            });

            const strategy = new ForCountSnapshotStrategy({ count: 1 });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("returns false when count threshold is not reached", () => {
            const aggregateRoot = createMock<AggregateRoot>({
                uncommittedEvents: [
                    {
                        payload: new TestEvent()
                    }
                ],
                version: 0
            });

            const strategy = new ForCountSnapshotStrategy({ count: 2 });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("returns false when not crossing threshold with existing version", () => {
            const aggregateRoot = createMock<AggregateRoot>({
                uncommittedEvents: [
                    {
                        payload: new TestEvent()
                    }
                ],
                version: 8
            });

            const strategy = new ForCountSnapshotStrategy({ count: 10 });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });

        test("returns false when exactly at threshold without crossing", () => {
            const aggregateRoot = createMock<AggregateRoot>({
                uncommittedEvents: [
                    {
                        payload: new TestEvent()
                    }
                ],
                version: 10
            });

            const strategy = new ForCountSnapshotStrategy({ count: 10 });

            expect(strategy.shouldCreateSnapshot(aggregateRoot)).toBe(false);
        });
    });
});
