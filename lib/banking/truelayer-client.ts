// Live-capable TrueLayer Payments API client (the "trueLayerClient").
//
// Distinct from the Data API bank feed in truelayer.ts:
//   • Auth is the OAuth2 `client_credentials` grant (server-to-server), NOT the
//     user-consent authorization_code flow.
//   • Every mutating request is signed with a Tl-Signature (see truelayer-signing.ts).
//   • Hosts follow TRUELAYER_ENV (live -> auth.truelayer.com / api.truelayer.com).
//
// Going live requires: a signed TrueLayer agreement + go-live approval, live
// client credentials, and your PUBLIC signing key uploaded in the console (the
// `kid`). The private key + kid are read from env.

import { randomUUID } from "node:crypto";
import { trueLayerConfig, TrueLayerApiError } from "./truelayer";
import { signTlRequest } from "./truelayer-signing";

async function readBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return await res.text().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Auth — client_credentials access token (cached until ~60s before expiry)
// ---------------------------------------------------------------------------

let tokenCache: { accessToken: string; expiresAtMs: number; scope: string } | null = null;

/** Securely exchange the live client_id/client_secret for a Payments access token. */
export async function getPaymentsAccessToken(
  scope = "payments",
  nowMs: number = Date.now(),
): Promise<string> {
  if (tokenCache && tokenCache.scope === scope && tokenCache.expiresAtMs > nowMs + 60_000) {
    return tokenCache.accessToken;
  }

  const cfg = trueLayerConfig();
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new TrueLayerSigningMissingCreds();
  }

  const res = await fetch(`${cfg.authBaseUrl}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      scope,
    }),
  });
  if (!res.ok) {
    throw new TrueLayerApiError(
      "TrueLayer client_credentials token request failed",
      res.status,
      await readBody(res),
    );
  }
  const json = (await res.json()) as { access_token: string; expires_in?: number };
  tokenCache = {
    accessToken: json.access_token,
    scope,
    expiresAtMs: nowMs + (json.expires_in ?? 3600) * 1000,
  };
  return tokenCache.accessToken;
}

class TrueLayerSigningMissingCreds extends TrueLayerApiError {
  constructor() {
    super("TRUELAYER_CLIENT_ID / TRUELAYER_CLIENT_SECRET are not configured", 500);
  }
}

/** Test seam: clear the cached access token. */
export function _resetPaymentsTokenCache(): void {
  tokenCache = null;
}

// ---------------------------------------------------------------------------
// Signed requests
// ---------------------------------------------------------------------------

export interface PaymentsRequestInit {
  method?: "POST" | "GET" | "DELETE";
  /** API path, e.g. "/v3/payments" or "/v3/mandates". */
  path: string;
  /** Request payload — serialised once and used for BOTH the signature and body. */
  body?: unknown;
  /** Reuse a key to make a retry idempotent; auto-generated when omitted. */
  idempotencyKey?: string;
  scope?: string;
}

/**
 * Authenticated, Tl-Signature-signed request to the Payments API. The body is
 * serialised exactly once so the signed bytes match the bytes on the wire.
 * GET requests are neither signed nor idempotency-keyed (TrueLayer only requires
 * signing on mutating calls).
 */
export async function paymentsRequest<T = unknown>(init: PaymentsRequestInit): Promise<T> {
  const cfg = trueLayerConfig();
  const method = init.method ?? "POST";
  const accessToken = await getPaymentsAccessToken(init.scope ?? "payments");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  let bodyStr: string | undefined;
  if (method !== "GET") {
    bodyStr = init.body !== undefined ? JSON.stringify(init.body) : "";
    const idempotencyKey = init.idempotencyKey ?? randomUUID();
    headers["Idempotency-Key"] = idempotencyKey;
    headers["Tl-Signature"] = signTlRequest({
      method,
      path: init.path,
      body: bodyStr,
      // TrueLayer requires the Idempotency-Key to be covered by the signature.
      signedHeaders: { "Idempotency-Key": idempotencyKey },
    });
  }

  const res = await fetch(`${cfg.apiBaseUrl}${init.path}`, {
    method,
    headers,
    body: bodyStr || undefined,
  });
  if (!res.ok) {
    throw new TrueLayerApiError(
      `TrueLayer Payments ${method} ${init.path} failed`,
      res.status,
      await readBody(res),
    );
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

/** Create a payment (POST /v3/payments). */
export function createPayment<T = unknown>(payment: unknown, idempotencyKey?: string): Promise<T> {
  return paymentsRequest<T>({ path: "/v3/payments", body: payment, idempotencyKey });
}

/** Create a mandate (POST /v3/mandates). */
export function createMandate<T = unknown>(mandate: unknown, idempotencyKey?: string): Promise<T> {
  return paymentsRequest<T>({ path: "/v3/mandates", body: mandate, idempotencyKey });
}

/** Fetch a payment's current status (GET /v3/payments/{id}). */
export function getPayment<T = unknown>(paymentId: string): Promise<T> {
  return paymentsRequest<T>({ method: "GET", path: `/v3/payments/${encodeURIComponent(paymentId)}` });
}
