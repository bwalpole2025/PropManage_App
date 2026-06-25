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
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import type { TransactionFilters } from "@/services/transactions";

const NINETY_DAYS = 90 * 86_400_000;

function revalidateTxn() {
  revalidatePath("/transactions");
  revalidatePath("/transactions/reconcile");
  revalidatePath("/tax");
  revalidatePath("/dashboard");
}

/**
 * Connect a (mock) bank feed end-to-end: create a BankConnection + BankAccount
 * and import the last 90 days of transactions as domain Transactions
 * (uncategorised + unreconciled) ready to categorise and reconcile.
 */
export async function connectBankFeedAction(): Promise<{ imported: number }> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_TRANSACTIONS);

  const linked = await services.bankFeed.completeLink({
    entityId,
    linkSessionId: `mock-link-${entityId}`,
    code: "mock",
  });

  const connection =
    (await prisma.bankConnection.findFirst({
      where: { accountId: entityId, providerConnectionId: linked.connectionId },
      select: { id: true },
    })) ??
    (await prisma.bankConnection.create({
      data: {
        accountId: entityId,
        provider: "mock",
        providerConnectionId: linked.connectionId,
        institutionName: "Mock Bank (demo)",
        status: BankConnStatus.ACTIVE,
      },
      select: { id: true },
    }));

  const now = new Date();
  const from = new Date(now.getTime() - NINETY_DAYS);
  let imported = 0;

  for (const acc of linked.accounts) {
    const bankAccount =
      (await prisma.bankAccount.findFirst({
        where: { bankConnectionId: connection.id, providerAccountId: acc.id },
        select: { id: true },
      })) ??
      (await prisma.bankAccount.create({
        data: {
          bankConnectionId: connection.id,
          providerAccountId: acc.id,
          name: acc.name,
          sortCode: acc.sortCode ?? null,
          accountNumberMasked: acc.accountNumberMasked ?? null,
        },
        select: { id: true },
      }));

    const { transactions } = await services.bankFeed.listTransactions({
      accountId: acc.id,
      from: from.toISOString(),
      to: now.toISOString(),
    });

    for (const t of transactions) {
      const bankTxn = await prisma.bankTransaction.upsert({
        where: { providerTxnId: t.providerTxnId },
        create: {
          bankAccountId: bankAccount.id,
          providerTxnId: t.providerTxnId,
          amountPence: t.amountPence,
          date: new Date(t.date),
          description: t.description,
          rawCategory: t.rawCategory ?? null,
        },
        update: {},
        select: { id: true },
      });

      const exists = await prisma.transaction.findFirst({
        where: { accountId: entityId, bankTransactionId: bankTxn.id },
        select: { id: true },
      });
      if (exists) continue;

      await prisma.transaction.create({
        data: {
          accountId: entityId,
          bankTransactionId: bankTxn.id,
          direction:
            t.amountPence >= 0 ? TxnDirection.INCOME : TxnDirection.EXPENSE,
          amountPence: Math.abs(t.amountPence),
          date: new Date(t.date),
          description: t.description,
          category: null,
          source: TxnSource.BANK_FEED,
          status: TxnStatus.UNRECONCILED,
        },
      });
      imported++;
    }
  }

  revalidateTxn();
  return { imported };
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
  const { entityId } = await getActiveContext();
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

  revalidateTxn();
  return { created: creates.length, skipped };
}
