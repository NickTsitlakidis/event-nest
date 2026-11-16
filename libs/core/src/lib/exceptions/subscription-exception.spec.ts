import { CoreErrorCodes } from "./core-error-codes.enum";
import { EventNestException } from "./event-nest-exception";
import { SubscriptionException } from "./subscription-exception";

describe("SubscriptionException", () => {
    test("has the name, code and formatted message", () => {
        const exception = new SubscriptionException(new Error("subscription failed"), "OrderPlaced", "event-123");

        expect(exception).toBeInstanceOf(SubscriptionException);
        expect(exception).toBeInstanceOf(EventNestException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.name).toBe("SubscriptionException");
        expect(exception.errorCode).toBe(CoreErrorCodes.SUBSCRIPTION_FAILURE);
        expect(exception.errorCode).toBe(SubscriptionException.code);
        expect(exception.message).toBe("Error while running subscriptions for event OrderPlaced with id event-123");
    });

    test("exposes the caught error, event class name, and event id", () => {
        const caughtError = new Error("subscription failed");
        const exception = new SubscriptionException(caughtError, "OrderPlaced", "event-123");

        expect(exception.caughtError).toBe(caughtError);
        expect(exception.eventClassName).toBe("OrderPlaced");
        expect(exception.eventId).toBe("event-123");
    });
});
