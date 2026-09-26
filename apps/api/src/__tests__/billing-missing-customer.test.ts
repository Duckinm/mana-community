import { describe, expect, it } from "bun:test";
import Stripe from "stripe";
import { isMissingCustomer } from "@api/modules/billing/service";

describe("isMissingCustomer", () => {
  it("matches the error Stripe raises for a customer belonging to another account", () => {
    // Shape seen in production after the test -> live cutover: every stored
    // stripeCustomerId was minted in the sandbox account.
    const err = new Stripe.errors.StripeInvalidRequestError({
      type: "invalid_request_error",
      code: "resource_missing",
      message: "No such customer: 'cus_Uy8ic9EFreu8ky'",
    });
    expect(isMissingCustomer(err)).toBe(true);
  });

  it("does not swallow other Stripe or runtime failures", () => {
    const badParam = new Stripe.errors.StripeInvalidRequestError({
      type: "invalid_request_error",
      code: "parameter_invalid_integer",
      message: "limit must be an integer",
    });
    const apiDown = new Stripe.errors.StripeAPIError({
      type: "api_error",
      message: "Stripe is down",
    });
    expect(isMissingCustomer(badParam)).toBe(false);
    expect(isMissingCustomer(apiDown)).toBe(false);
    expect(isMissingCustomer(new Error("No such customer"))).toBe(false);
  });
});
