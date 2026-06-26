import { describe, it, expect } from "vitest";
import {
  buildAuthUrl,
  mapAccount,
  mapTransaction,
  toSignedPence,
  trueLayerConfig,
  type TrueLayerConfig,
} from "@/lib/banking/truelayer";
import { signState, verifyState } from "@/lib/banking/state";

// State signing needs a secret; CI sets AUTH_SECRET, fall back for local runs.
process.env.AUTH_SECRET ??= "test-auth-secret";

const CFG: TrueLayerConfig = {
  clientId: "client-123",
  clientSecret: "secret",
  authBaseUrl: "https://auth.truelayer-sandbox.com",
  apiBaseUrl: "https://api.truelayer-sandbox.com",
  redirectUri: "https://app.example/api/banking/truelayer/callback",
  providers: "uk-cs-mock uk-ob-all",
  scopes: ["info", "accounts", "transactions", "offline_access"],
};

describe("TrueLayer money mapping", () => {
  it("credits are positive pence, debits negative, by transaction_type", () => {
    expect(toSignedPence(12.34, "CREDIT")).toBe(1234);
    expect(toSignedPence(12.34, "DEBIT")).toBe(-1234);
    // type wins over the raw amount's sign
    expect(toSignedPence(-50, "CREDIT")).toBe(5000);
  });

  it("rounds float amounts to the nearest penny", () => {
    expect(toSignedPence(9.999, "CREDIT")).toBe(1000);
    expect(toSignedPence(0.1 + 0.2, "DEBIT")).toBe(-30);
  });

  it("falls back to the amount sign when type is absent", () => {
    expect(toSignedPence(5)).toBe(500);
    expect(toSignedPence(-5)).toBe(-500);
  });

  it("maps a transaction to our DTO", () => {
    const dto = mapTransaction({
      transaction_id: "tx-1",
      timestamp: "2026-06-01T10:00:00Z",
      description: "RENT JSMITH",
      amount: 1250,
      transaction_type: "CREDIT",
      transaction_category: "transfer",
    });
    expect(dto).toEqual({
      providerTxnId: "tx-1",
      amountPence: 125000,
      date: "2026-06-01T10:00:00Z",
      description: "RENT JSMITH",
      rawCategory: "transfer",
    });
  });

  it("masks the account number to the last 4 digits", () => {
    const dto = mapAccount({
      account_id: "acc-1",
      display_name: "Current",
      currency: "GBP",
      account_number: { sort_code: "04-00-04", number: "12345678" },
    });
    expect(dto.accountNumberMasked).toBe("****5678");
    expect(dto.sortCode).toBe("04-00-04");
  });
});

describe("TrueLayer auth URL", () => {
  it("includes client id, redirect, providers, state and offline_access", () => {
    const url = new URL(buildAuthUrl(CFG, "the-state"));
    expect(url.origin + url.pathname).toBe("https://auth.truelayer-sandbox.com/");
    expect(url.searchParams.get("client_id")).toBe("client-123");
    expect(url.searchParams.get("redirect_uri")).toBe(CFG.redirectUri);
    expect(url.searchParams.get("state")).toBe("the-state");
    expect(url.searchParams.get("providers")).toBe("uk-cs-mock uk-ob-all");
    expect(url.searchParams.get("scope")).toContain("offline_access");
  });
});

describe("trueLayerConfig", () => {
  it("defaults to sandbox hosts", () => {
    const cfg = trueLayerConfig();
    expect(cfg.authBaseUrl).toContain("truelayer-sandbox.com");
    expect(cfg.apiBaseUrl).toContain("truelayer-sandbox.com");
  });
});

describe("signed OAuth state", () => {
  it("round-trips entity + linkSession", () => {
    const state = signState({
      entityId: "ent-1",
      linkSessionId: "ls-1",
      nowMs: 1_700_000_000_000,
    });
    const decoded = verifyState(state);
    expect(decoded?.entityId).toBe("ent-1");
    expect(decoded?.linkSessionId).toBe("ls-1");
  });

  it("rejects a tampered state", () => {
    const state = signState({ entityId: "ent-1", linkSessionId: "ls-1", nowMs: 1 });
    const [body] = state.split(".");
    // Swap the entity but keep the original signature -> must fail.
    const forgedBody = Buffer.from(
      JSON.stringify({ entityId: "victim", linkSessionId: "ls-1", nonce: "x", iat: 1 }),
    ).toString("base64url");
    expect(verifyState(`${forgedBody}.${state.split(".")[1]}`)).toBeNull();
    expect(verifyState(`${body}.deadbeef`)).toBeNull();
    expect(verifyState("garbage")).toBeNull();
  });
});
