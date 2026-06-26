// Real TrueLayer Data API bank feed. Selected by BANK_FEED_PROVIDER=truelayer
// outside development. Implements the same BankFeedService interface as the mock,
// so UI/ingest/poll/webhook code is unchanged.
//
// Token handling: completeLink hands the opaque access/refresh tokens back to
// the caller (actions/bank.ts), which encrypts + persists them. Thereafter THIS
// adapter reads the encrypted tokens off the BankConnection row, transparently
// refreshing on expiry (a 401), and re-encrypting the rotated token. Raw bank
// credentials never touch us.

import type { BankConnection } from "@prisma/client";
import { prisma } from "../../db";
import { decryptToken, encryptToken } from "../../crypto";
import { BankConnStatus } from "../../enums";
import { signState, verifyState } from "../../banking/state";
import {
  WebhookSignatureError,
  verifyTlSignature,
} from "../../banking/webhook-signature";
import {
  TrueLayerApiError,
  buildAuthUrl,
  exchangeCode,
  fetchAccounts,
  fetchConnectionMeta,
  fetchTransactions,
  refreshAccessToken,
  revokeAccess,
  trueLayerConfig,
} from "../../banking/truelayer";
import { randomUUID } from "node:crypto";
import type {
  BankAccountDTO,
  BankFeedService,
  BankTransactionDTO,
  BankWebhookEvent,
} from "../types";

export class TrueLayerBankFeedService implements BankFeedService {
  readonly providerName = "truelayer";

  private cfg = trueLayerConfig();

  // -------------------------------------------------------------------------
  // Link (OAuth) flow
  // -------------------------------------------------------------------------

  async createLinkSession(input: { entityId: string; redirectUri: string }) {
    const linkSessionId = randomUUID();
    const state = signState({
      entityId: input.entityId,
      linkSessionId,
      nowMs: Date.now(),
    });
    return { linkSessionId, linkUrl: buildAuthUrl(this.cfg, state) };
  }

  /** Exchange the code for tokens and read back the accounts + connection id. */
  async completeLink(input: {
    entityId: string;
    linkSessionId: string;
    code: string;
  }): Promise<{
    connectionId: string;
    accounts: BankAccountDTO[];
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string;
    institutionName?: string;
  }> {
    const tokens = await exchangeCode(this.cfg, input.code, Date.now());
    const [meta, accountsResult] = await Promise.all([
      fetchConnectionMeta(this.cfg, tokens.accessToken),
      fetchAccounts(this.cfg, tokens.accessToken),
    ]);

    return {
      // credentials_id is the stable provider connection id webhooks reference.
      connectionId: meta.credentialsId ?? input.linkSessionId,
      accounts: accountsResult.accounts,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      institutionName: meta.institutionName ?? accountsResult.institutionName,
    };
  }

  /** Decode (verify) a callback state — used by the OAuth callback route. */
  verifyLinkState(state: string) {
    return verifyState(state);
  }

  // -------------------------------------------------------------------------
  // Data fetch (token resolved + refreshed from the DB)
  // -------------------------------------------------------------------------

  async listAccounts(connectionId: string): Promise<BankAccountDTO[]> {
    const conn = await this.connectionById(connectionId);
    if (!conn) return [];
    return this.withAccessToken(conn, (token) =>
      fetchAccounts(this.cfg, token).then((r) => r.accounts),
    );
  }

  async listTransactions(input: {
    accountId: string;
    from: string;
    to: string;
    cursor?: string;
    connectionId?: string;
  }): Promise<{ transactions: BankTransactionDTO[]; nextCursor?: string }> {
    const conn = input.connectionId
      ? await this.connectionById(input.connectionId)
      : await this.connectionByProviderAccount(input.accountId);
    if (!conn) return { transactions: [] };

    const transactions = await this.withAccessToken(conn, (token) =>
      fetchTransactions(this.cfg, token, input.accountId, input.from, input.to),
    );
    return { transactions };
  }

  // -------------------------------------------------------------------------
  // Webhook
  // -------------------------------------------------------------------------

  async handleWebhook(input: {
    headers: Record<string, string>;
    rawBody: string;
    method?: string;
    path?: string;
  }): Promise<BankWebhookEvent> {
    const signature = input.headers["tl-signature"] ?? input.headers["Tl-Signature"];
    if (!signature) {
      throw new WebhookSignatureError("Missing Tl-Signature header");
    }
    const valid = await verifyTlSignature({
      tlSignature: signature,
      method: input.method ?? "POST",
      path: input.path ?? "/api/webhooks/bank-feed",
      headers: input.headers,
      body: input.rawBody,
    });
    if (!valid) throw new WebhookSignatureError("Invalid Tl-Signature");

    const body = JSON.parse(input.rawBody || "{}");
    // TrueLayer references the connection by credentials_id; tolerate a couple
    // of shapes since Data API webhook payloads vary by event type.
    const connectionId: string =
      body.credentials_id ?? body.connection_id ?? body.results?.credentials_id ?? "";
    const type: string = (body.type ?? body.event_type ?? "").toString().toLowerCase();

    if (/revok|expir|disconnect/.test(type)) {
      return { kind: "CONNECTION_EXPIRED", connectionId };
    }
    // Any other notification (new data / refresh complete) → pull fresh data.
    return { kind: "TRANSACTIONS_AVAILABLE", connectionId, accountIds: [] };
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async refreshConnection(
    providerConnectionId: string,
  ): Promise<{ status: BankConnStatus }> {
    const conn = await prisma.bankConnection.findFirst({
      where: { providerConnectionId },
    });
    if (!conn?.refreshTokenEnc) return { status: BankConnStatus.ERROR };
    try {
      await this.refreshAndPersist(conn);
      return { status: BankConnStatus.ACTIVE };
    } catch {
      return { status: BankConnStatus.EXPIRED };
    }
  }

  async revokeConnection(providerConnectionId: string): Promise<void> {
    const conn = await prisma.bankConnection.findFirst({
      where: { providerConnectionId },
    });
    if (!conn?.accessTokenEnc) return;
    try {
      await this.withAccessToken(conn, (token) => revokeAccess(this.cfg, token));
    } catch {
      // Best-effort: the local row is marked REVOKED by the caller regardless.
    }
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private async connectionById(id: string): Promise<BankConnection | null> {
    return prisma.bankConnection.findUnique({ where: { id } });
  }

  private async connectionByProviderAccount(
    providerAccountId: string,
  ): Promise<BankConnection | null> {
    const acc = await prisma.bankAccount.findFirst({
      where: { providerAccountId },
      orderBy: { createdAt: "desc" },
      include: { connection: true },
    });
    return acc?.connection ?? null;
  }

  /** Run `fn` with a valid access token, refreshing once on a 401. */
  private async withAccessToken<T>(
    conn: BankConnection,
    fn: (accessToken: string) => Promise<T>,
  ): Promise<T> {
    if (!conn.accessTokenEnc) throw new Error("Connection has no access token");
    try {
      return await fn(decryptToken(conn.accessTokenEnc));
    } catch (e) {
      if (e instanceof TrueLayerApiError && e.httpStatus === 401 && conn.refreshTokenEnc) {
        const refreshed = await this.refreshAndPersist(conn);
        return fn(refreshed);
      }
      throw e;
    }
  }

  /** Use the refresh token to mint a new access token; persist (re-encrypt). */
  private async refreshAndPersist(conn: BankConnection): Promise<string> {
    if (!conn.refreshTokenEnc) throw new Error("Connection has no refresh token");
    const tokens = await refreshAccessToken(
      this.cfg,
      decryptToken(conn.refreshTokenEnc),
      Date.now(),
    );
    await prisma.bankConnection.update({
      where: { id: conn.id },
      data: {
        accessTokenEnc: encryptToken(tokens.accessToken),
        ...(tokens.refreshToken
          ? { refreshTokenEnc: encryptToken(tokens.refreshToken) }
          : {}),
      },
    });
    return tokens.accessToken;
  }
}
