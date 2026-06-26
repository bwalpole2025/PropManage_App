// Low-level TrueLayer Data API client. Pure HTTP + mapping — NO database access
// and NO token persistence (the adapter in services/real/bankFeed.ts owns that).
//
// Docs: https://docs.truelayer.com/docs/data-api-basics
//   Auth (sandbox):  https://auth.truelayer-sandbox.com
//   Auth (live):     https://auth.truelayer.com
//   Data (sandbox):  https://api.truelayer-sandbox.com
//   Data (live):     https://api.truelayer.com
//
// We only ever hold an OPAQUE access/refresh token — never the user's bank
// credentials. `offline_access` is requested so we receive a refresh token and
// can keep a connection alive for the ~90-day consent window without the user
// re-authenticating each hour (the access token itself is short-lived).

import type { BankAccountDTO, BankTransactionDTO } from "../services/types";

export interface TrueLayerConfig {
  clientId: string;
  clientSecret: string;
  authBaseUrl: string;
  apiBaseUrl: string;
  redirectUri: string;
  /** Space-separated TrueLayer provider scopes, e.g. "uk-ob-all uk-oauth-all". */
  providers: string;
  scopes: string[];
}

/** Default Data API scopes. `offline_access` is required to get a refresh token. */
const DEFAULT_SCOPES = [
  "info",
  "accounts",
  "balance",
  "transactions",
  "offline_access",
];

/** Resolve config from env. `TRUELAYER_ENV=sandbox|live` selects the hosts. */
export function trueLayerConfig(): TrueLayerConfig {
  const env = (process.env.TRUELAYER_ENV ?? "sandbox").toLowerCase();
  const live = env === "live" || env === "production";
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return {
    clientId: process.env.TRUELAYER_CLIENT_ID ?? "",
    clientSecret: process.env.TRUELAYER_CLIENT_SECRET ?? "",
    authBaseUrl: live
      ? "https://auth.truelayer.com"
      : "https://auth.truelayer-sandbox.com",
    apiBaseUrl: live
      ? "https://api.truelayer.com"
      : "https://api.truelayer-sandbox.com",
    redirectUri:
      process.env.TRUELAYER_REDIRECT_URI ??
      `${appUrl}/api/banking/truelayer/callback`,
    // Sandbox ships a mock bank (`uk-cs-mock`) so the flow is testable end to end.
    providers:
      process.env.TRUELAYER_PROVIDERS ??
      (live ? "uk-ob-all uk-oauth-all" : "uk-cs-mock uk-ob-all uk-oauth-all"),
    scopes: DEFAULT_SCOPES,
  };
}

/** A parsed TrueLayer error, surfaced with the HTTP status for handling/refresh. */
export class TrueLayerApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "TrueLayerApiError";
  }
}

export interface TrueLayerTokens {
  accessToken: string;
  refreshToken?: string;
  /** Absolute expiry of the *access token* (seconds-precision ISO). */
  expiresAt: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

async function readError(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return await res.text().catch(() => undefined);
  }
}

function expiresAtFrom(expiresIn: number, now: number): string {
  // Subtract a 60s safety margin so we refresh slightly early.
  return new Date(now + Math.max(0, expiresIn - 60) * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------

/** Build the TrueLayer hosted consent URL the user is redirected to. */
export function buildAuthUrl(cfg: TrueLayerConfig, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    scope: cfg.scopes.join(" "),
    redirect_uri: cfg.redirectUri,
    providers: cfg.providers,
    state,
  });
  return `${cfg.authBaseUrl}/?${params.toString()}`;
}

/** Exchange an authorization code for tokens (called once, in the callback). */
export async function exchangeCode(
  cfg: TrueLayerConfig,
  code: string,
  nowMs: number,
): Promise<TrueLayerTokens> {
  const res = await fetch(`${cfg.authBaseUrl}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      code,
    }),
  });
  if (!res.ok) {
    throw new TrueLayerApiError(
      "TrueLayer code exchange failed",
      res.status,
      await readError(res),
    );
  }
  const json = (await res.json()) as TokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: expiresAtFrom(json.expires_in, nowMs),
  };
}

/** Refresh an expired access token. TrueLayer may rotate the refresh token. */
export async function refreshAccessToken(
  cfg: TrueLayerConfig,
  refreshToken: string,
  nowMs: number,
): Promise<TrueLayerTokens> {
  const res = await fetch(`${cfg.authBaseUrl}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new TrueLayerApiError(
      "TrueLayer token refresh failed",
      res.status,
      await readError(res),
    );
  }
  const json = (await res.json()) as TokenResponse;
  return {
    accessToken: json.access_token,
    // Keep the existing refresh token if TrueLayer didn't rotate it.
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: expiresAtFrom(json.expires_in, nowMs),
  };
}

// ---------------------------------------------------------------------------
// Data API
// ---------------------------------------------------------------------------

interface TlAccount {
  account_id: string;
  display_name?: string;
  currency?: string;
  account_number?: { sort_code?: string; number?: string };
  provider?: { display_name?: string };
}

interface TlTransaction {
  transaction_id: string;
  timestamp: string;
  description?: string;
  merchant_name?: string;
  amount: number;
  currency?: string;
  transaction_type?: string; // "DEBIT" | "CREDIT"
  transaction_category?: string;
}

async function getJson<T>(
  cfg: TrueLayerConfig,
  path: string,
  accessToken: string,
): Promise<{ results: T[] }> {
  const res = await fetch(`${cfg.apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new TrueLayerApiError(
      `TrueLayer GET ${path} failed`,
      res.status,
      await readError(res),
    );
  }
  return (await res.json()) as { results: T[] };
}

function maskNumber(num?: string): string | undefined {
  if (!num) return undefined;
  const last4 = num.slice(-4);
  return `****${last4}`;
}

export function mapAccount(a: TlAccount): BankAccountDTO {
  return {
    id: a.account_id,
    name: a.display_name ?? a.provider?.display_name ?? "Account",
    sortCode: a.account_number?.sort_code,
    accountNumberMasked: maskNumber(a.account_number?.number),
    currency: a.currency ?? "GBP",
  };
}

/** Convert TrueLayer's major-unit amount to signed pence (positive = credit/in). */
export function toSignedPence(amount: number, type?: string): number {
  const magnitude = Math.round(Math.abs(amount) * 100);
  // Trust transaction_type when present; otherwise fall back to amount's sign.
  if (type) return type.toUpperCase() === "CREDIT" ? magnitude : -magnitude;
  return amount >= 0 ? magnitude : -magnitude;
}

export function mapTransaction(t: TlTransaction): BankTransactionDTO {
  return {
    providerTxnId: t.transaction_id,
    amountPence: toSignedPence(t.amount, t.transaction_type),
    date: t.timestamp,
    description: t.description || t.merchant_name || "Bank transaction",
    rawCategory: t.transaction_category,
  };
}

interface TlMe {
  credentials_id?: string;
  provider?: { display_name?: string };
}

/**
 * Identify the connection behind an access token. `credentials_id` is stable for
 * the life of the consent and is what Data API webhooks reference — we store it
 * as `providerConnectionId` so a webhook can find the right BankConnection.
 */
export async function fetchConnectionMeta(
  cfg: TrueLayerConfig,
  accessToken: string,
): Promise<{ credentialsId?: string; institutionName?: string }> {
  const { results } = await getJson<TlMe>(cfg, "/data/v1/me", accessToken);
  const me = results[0];
  return {
    credentialsId: me?.credentials_id,
    institutionName: me?.provider?.display_name,
  };
}

export async function fetchAccounts(
  cfg: TrueLayerConfig,
  accessToken: string,
): Promise<{ accounts: BankAccountDTO[]; institutionName?: string }> {
  const { results } = await getJson<TlAccount>(cfg, "/data/v1/accounts", accessToken);
  return {
    accounts: results.map(mapAccount),
    institutionName: results[0]?.provider?.display_name,
  };
}

export async function fetchTransactions(
  cfg: TrueLayerConfig,
  accessToken: string,
  accountId: string,
  fromIso: string,
  toIso: string,
): Promise<BankTransactionDTO[]> {
  // TrueLayer expects YYYY-MM-DD (or full ISO) for from/to.
  const qs = new URLSearchParams({ from: fromIso, to: toIso });
  const { results } = await getJson<TlTransaction>(
    cfg,
    `/data/v1/accounts/${encodeURIComponent(accountId)}/transactions?${qs}`,
    accessToken,
  );
  return results.map(mapTransaction);
}

/** Revoke the consent behind an access token (DELETE /data/v1/me). */
export async function revokeAccess(
  cfg: TrueLayerConfig,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${cfg.apiBaseUrl}/data/v1/me`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 204 = revoked; 401 = token already invalid (treat as success).
  if (!res.ok && res.status !== 401) {
    throw new TrueLayerApiError(
      "TrueLayer revoke failed",
      res.status,
      await readError(res),
    );
  }
}
