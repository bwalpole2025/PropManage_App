"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { services } from "@/lib/services";
import {
  BankConnStatus,
  TxnDirection,
  TxnSource,
  TxnStatus,
} from "@/lib/enums";
import { poundsToPence } from "@/lib/format";
import { allCategoryDirection, isKnownCategory } from "@/lib/categories";
import { parseCsv } from "@/lib/csv";
import { randomUUID } from "node:crypto";
import { encryptToken } from "@/lib/crypto";
import { ingestBankConnection } from "@/lib/bank-ingest";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import { recordAudit, AuditAction } from "@/lib/audit";
import type { TransactionFilters } from "@/services/transactions";

const NINETY_DAYS = 90 * 86_400_000;
const CONSENT_WINDOW_MS = NINETY_DAYS; // open-banking consent typically ~90 days

function revalidateBanking() {
  revalidatePath("/settings/banking");
  revalidatePath("/transactions");
}

function revalidateTxn() {
  revalidatePath("/transactions");
  revalidatePath("/transactions/reconcile");
  revalidatePath("/tax");
  revalidatePath("/dashboard");
}

/** Step 1 of the open-banking consent flow: create a hosted link session. */
export async function startBankLinkAction(): Promise<{
  linkSessionId: string;
  linkUrl: string;
}> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);
  return services.bankFeed.createLinkSession({
    entityId,
    redirectUri: "/transactions/connect",
  });
}

/**
 * Step 2: the user granted consent at the provider. Exchange the code for a
 * connection, persist it with an opaque token + consent expiry (never raw
 * credentials), upsert accounts, and ingest the recent transaction history.
 */
export async function completeBankLinkAction(input: {
  linkSessionId: string;
  code: string;
  institutionName?: string;
}): Promise<{ imported: number; connectionId: string }> {
  const { entityId, user } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);

  const linked = await services.bankFeed.completeLink({
    entityId,
    linkSessionId: input.linkSessionId,
    code: input.code,
  });

  const expiresAt = new Date(Date.now() + CONSENT_WINDOW_MS);
  const tokenData = {
    status: BankConnStatus.ACTIVE,
    expiresAt,
    accessTokenEnc: encryptToken(`mock-access-${linked.connectionId}`),
    refreshTokenEnc: encryptToken(`mock-refresh-${linked.connectionId}`),
    institutionName: input.institutionName ?? "Mock Bank (demo)",
  };

  const existing = await prisma.bankConnection.findFirst({
    where: { accountId: entityId, providerConnectionId: linked.connectionId },
    select: { id: true },
  });
  const connection = existing
    ? await prisma.bankConnection.update({
        where: { id: existing.id },
        data: tokenData,
        select: { id: true },
      })
    : await prisma.bankConnection.create({
        data: {
          accountId: entityId,
          provider: services.bankFeed.providerName,
          providerConnectionId: linked.connectionId,
          ...tokenData,
        },
        select: { id: true },
      });

  for (const acc of linked.accounts) {
    const found = await prisma.bankAccount.findFirst({
      where: { bankConnectionId: connection.id, providerAccountId: acc.id },
      select: { id: true },
    });
    if (!found) {
      await prisma.bankAccount.create({
        data: {
          bankConnectionId: connection.id,
          providerAccountId: acc.id,
          name: acc.name,
          sortCode: acc.sortCode ?? null,
          accountNumberMasked: acc.accountNumberMasked ?? null,
        },
      });
    }
  }

  // Historical import — no per-payment notifications for the backfill.
  const { imported } = await ingestBankConnection(connection.id, { notify: false });
  await recordAudit({
    accountId: entityId,
    actorUserId: user.id,
    action: AuditAction.BANK_CONNECT,
    targetType: "BankConnection",
    targetId: connection.id,
    metadata: {
      provider: services.bankFeed.providerName,
      institutionName: input.institutionName ?? null,
      imported,
    },
  });
  revalidateTxn();
  revalidateBanking();
  return { imported, connectionId: connection.id };
}

/** Backward-compatible one-shot connect (start + complete with the mock code). */
export async function connectBankFeedAction(): Promise<{ imported: number }> {
  const session = await startBankLinkAction();
  const { imported } = await completeBankLinkAction({
    linkSessionId: session.linkSessionId,
    code: "mock-auth-code",
  });
  return { imported };
}

/**
 * Dev/demo: inject a fresh incoming payment on the entity's active connection
 * so the webhook/real-time flow is demonstrable without the worker. Creates a
 * new bank + domain transaction and fires a "payment received" notification.
 */
export async function simulateIncomingPaymentAction(): Promise<{ ok: boolean }> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);

  const conn = await prisma.bankConnection.findFirst({
    where: { accountId: entityId, status: BankConnStatus.ACTIVE },
    include: { accounts: { take: 1 } },
  });
  if (!conn || conn.accounts.length === 0) {
    throw new Error("Connect a bank feed first");
  }
  const account = conn.accounts[0];
  const now = new Date();
  const amountPence = 125_000;
  const description = "FASTER PAYMENT TENANT RENT";

  const bankTxn = await prisma.bankTransaction.create({
    data: {
      bankAccountId: account.id,
      providerTxnId: `sim-${now.getTime()}-${randomUUID()}`,
      amountPence,
      date: now,
      description,
      rawCategory: "transfer",
    },
  });
  await prisma.transaction.create({
    data: {
      accountId: entityId,
      bankTransactionId: bankTxn.id,
      direction: TxnDirection.INCOME,
      amountPence,
      date: now,
      description,
      category: null,
      source: TxnSource.BANK_FEED,
      status: TxnStatus.UNRECONCILED,
    },
  });
  const { createPaymentReceivedNotifications } = await import(
    "@/lib/notifications/service"
  );
  await createPaymentReceivedNotifications(entityId, { amountPence, description });

  revalidateTxn();
  return { ok: true };
}

async function ownedConnection(entityId: string, connectionId: string) {
  const conn = await prisma.bankConnection.findFirst({
    where: { id: connectionId, accountId: entityId },
    select: { id: true, providerConnectionId: true },
  });
  if (!conn) throw new Error("Connection not found");
  return conn;
}

/** Re-consent / refresh an EXPIRED connection: reset token + expiry, re-ingest. */
export async function reconnectBankConnectionAction(
  connectionId: string,
): Promise<{ imported: number }> {
  const { entityId, user } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);
  const conn = await ownedConnection(entityId, connectionId);

  const { status } = await services.bankFeed.refreshConnection(
    conn.providerConnectionId,
  );
  await prisma.bankConnection.update({
    where: { id: conn.id },
    data: {
      status,
      expiresAt: new Date(Date.now() + CONSENT_WINDOW_MS),
      accessTokenEnc: encryptToken(`mock-access-${conn.providerConnectionId}`),
    },
  });
  const { imported } = await ingestBankConnection(conn.id, { notify: true });
  await recordAudit({
    accountId: entityId,
    actorUserId: user.id,
    action: AuditAction.BANK_RECONNECT,
    targetType: "BankConnection",
    targetId: conn.id,
    metadata: { imported },
  });
  revalidateTxn();
  revalidateBanking();
  return { imported };
}

/** Disconnect (revoke) a bank connection. */
export async function disconnectBankConnectionAction(
  connectionId: string,
): Promise<{ ok: boolean }> {
  const { entityId, user } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);
  const conn = await ownedConnection(entityId, connectionId);

  await services.bankFeed.revokeConnection(conn.providerConnectionId);
  await prisma.bankConnection.update({
    where: { id: conn.id },
    data: { status: BankConnStatus.REVOKED },
  });
  await recordAudit({
    accountId: entityId,
    actorUserId: user.id,
    action: AuditAction.BANK_DISCONNECT,
    targetType: "BankConnection",
    targetId: conn.id,
  });
  revalidateTxn();
  revalidateBanking();
  return { ok: true };
}

/**
 * Detach bank-imported transactions from their bank match so they can be
 * re-matched: clears the bank link and marks them unreconciled. Acts on the
 * BANK_FEED transactions matching the current filters (default = all).
 */
export async function bulkUnlinkTransactionsAction(
  filters: TransactionFilters = {},
): Promise<{ unlinked: number }> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);

  const where: Prisma.TransactionWhereInput = {
    accountId: entityId,
    source: TxnSource.BANK_FEED,
  };
  if (filters.propertyId) where.propertyId = filters.propertyId;
  if (filters.tenancyId) where.tenancyId = filters.tenancyId;
  if (filters.direction) where.direction = filters.direction;
  if (filters.category) where.category = filters.category;
  if (filters.minPence != null || filters.maxPence != null) {
    where.amountPence = {
      ...(filters.minPence != null ? { gte: filters.minPence } : {}),
      ...(filters.maxPence != null ? { lte: filters.maxPence } : {}),
    };
  }

  const result = await prisma.transaction.updateMany({
    where,
    data: { bankTransactionId: null, status: TxnStatus.UNRECONCILED },
  });

  revalidateTxn();
  return { unlinked: result.count };
}

export interface ImportState {
  created?: number;
  skipped?: number;
  error?: string;
}

/** Import transactions from an uploaded CSV (date, description, amount[, category, property]). */
export async function importTransactionsAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const { entityId, user } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file to import." };
  }

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { error: "That file has no data rows." };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iDate = col("date");
  const iDesc = col("description");
  const iAmount = col("amount");
  const iCategory = col("category");
  const iProperty = col("property");
  if (iDate < 0 || iDesc < 0 || iAmount < 0) {
    return { error: "CSV needs at least date, description and amount columns." };
  }

  const properties = await prisma.property.findMany({
    where: { accountId: entityId, archivedAt: null },
    select: { id: true, addressLine1: true },
  });
  const propByName = new Map(
    properties.map((p) => [p.addressLine1.trim().toLowerCase(), p.id]),
  );

  const creates: Prisma.TransactionCreateManyInput[] = [];
  let skipped = 0;
  for (const row of rows.slice(1)) {
    const rawDate = row[iDate]?.trim();
    const rawDesc = row[iDesc]?.trim();
    const rawAmount = row[iAmount]?.trim();
    if (!rawDate || !rawDesc || !rawAmount) {
      skipped++;
      continue;
    }
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
      skipped++;
      continue;
    }
    const rawCategory = iCategory >= 0 ? row[iCategory]?.trim() : "";
    const category = isKnownCategory(rawCategory) ? rawCategory : null;
    const direction = category
      ? allCategoryDirection[category]
      : rawAmount.startsWith("-")
        ? TxnDirection.EXPENSE
        : TxnDirection.INCOME;
    const rawProp = iProperty >= 0 ? row[iProperty]?.trim().toLowerCase() : "";
    const propertyId = rawProp ? (propByName.get(rawProp) ?? null) : null;

    creates.push({
      accountId: entityId,
      propertyId,
      direction,
      amountPence: Math.abs(poundsToPence(rawAmount)),
      date,
      description: rawDesc,
      category,
      source: TxnSource.IMPORTED,
      status: TxnStatus.UNRECONCILED,
    });
  }

  if (creates.length === 0) {
    return { error: "No valid rows found in that file." };
  }
  await prisma.transaction.createMany({ data: creates });

  await recordAudit({
    accountId: entityId,
    actorUserId: user.id,
    action: AuditAction.TRANSACTION_IMPORT,
    metadata: { created: creates.length, skipped },
  });
  revalidateTxn();
  return { created: creates.length, skipped };
}
