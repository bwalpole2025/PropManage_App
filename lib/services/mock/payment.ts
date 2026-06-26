import type {
  PaymentService,
  PaymentCheckoutSession,
  PaymentMethodSummary,
} from "../types";

/**
 * Mock card-billing provider. Simulates a provider-hosted checkout: no raw card
 * data is ever handled here — `createCheckoutSession` would, in a real provider,
 * return a URL to the provider's hosted page; the mock points back at the app's
 * success URL so local flows complete. `confirmCheckout` returns the classic
 * test card (display-only) as the provider would after the customer paid.
 */
export class MockPaymentService implements PaymentService {
  readonly providerName = "mock";

  async createCheckoutSession(input: {
    entityId: string;
    pricePence: number;
    interval: string;
    trialEndsAt?: string | null;
    successUrl: string;
    cancelUrl: string;
  }): Promise<PaymentCheckoutSession> {
    const sessionId = `cs_mock_${input.entityId}_${input.pricePence}_${input.interval}`;
    // A real provider returns its OWN hosted URL here; the mock returns the app
    // success URL so the (mocked) checkout "completes" immediately.
    return { sessionId, checkoutUrl: input.successUrl };
  }

  async confirmCheckout(input: {
    entityId: string;
    sessionId: string;
  }): Promise<PaymentMethodSummary> {
    return {
      customerId: `cus_mock_${input.entityId}`,
      brand: "Visa",
      last4: "4242",
    };
  }

  async cancelSubscription(_input: { entityId: string }): Promise<void> {
    // no-op in the mock
  }
}
