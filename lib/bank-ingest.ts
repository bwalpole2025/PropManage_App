// Shared bank-feed ingestion — the single path used by connect, poll, webhook
// and the dev simulator. Upserts raw BankTransaction rows and creates domain
// Transactions idempotently (by bankTransactionId); fires a "payment received"
// notification for each NEW income transaction when `notify` is set.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { services } from "@/lib/services";
import { BankConnStatus, TxnDirection, TxnSource, TxnStatus } from "@/lib/enums";
import { createPaymentReceivedNotifications } from "@/lib/notifications/service";

const NINETY_DAYS = 90 * 86_400_000;

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/** Flip any ACTIVE connection whose consent window has lapsed to EXPIRED. */
export async function expireStaleConnections(now: Date = new Date()): Promise<number> {
  const r = await prisma.bankConnection.updateMany({
    where: { status: BankConnStatus.ACTIVE, expiresAt: { lt: now } },
    data: { status: BankConnStatus.EXPIRED },
  });
  return r.count;
}

export async function ingestBankConnection(
  connectionId: string,
  opts: { from?: Date; to?: Date; notify?: boolean } = {},
): Promise<{ imported: number; notified: number }> {
  const connection = await prisma.bankConnection.findUnique({
    where: { id: connectionId },
    include: { accounts: true },
  });
  if (!connection) return { imported: 0, notified: 0 };

  const now = new Date();
  // Respect consent expiry: lazily mark + skip.
  if (
    connection.status === BankConnStatus.ACTIVE &&
    connection.expiresAt &&
    connection.expiresAt < now
  ) {
    await prisma.bankConnection.update({
      where: { id: connectionId },
      data: { status: BankConnStatus.EXPIRED },
    });
    return { imported: 0, notified: 0 };
  }
  if (connection.status !== BankConnStatus.ACTIVE) {
    return { imported: 0, notified: 0 };
  }

  const entityId = connection.accountId;
  const to = opts.to ?? now;
  const from = opts.from ?? new Date(to.getTime() - NINETY_DAYS);
  let imported = 0;
  let notified = 0;

  for (const account of connection.accounts) {
    const { transactions } = await services.bankFeed.listTransactions({
      accountId: account.providerAccountId,
      from: from.toISOString(),
      to: to.toISOString(),
    });
    for (const t of transactions) {
      try {
        // The BankTransaction is the IMMUTABLE idempotency key. If we've already
        // seen this provider txn, a domain Transaction was created at first
        // ingest — its bank link may since have been removed deliberately
        // (bulk unlink), so we must NOT re-create it.
        const seen = await prisma.bankTransaction.findUnique({
          where: { providerTxnId: t.providerTxnId },
          select: { id: true },
        });
        if (seen) continue;

        const bankTxn = await prisma.bankTransaction.create({
          data: {
            bankAccountId: account.id,
            providerTxnId: t.providerTxnId,
            amountPence: t.amountPence,
            date: new Date(t.date),
            description: t.description,
            rawCategory: t.rawCategory ?? null,
          },
          select: { id: true },
        });

        const isIncome = t.amountPence >= 0;
        await prisma.transaction.create({
          data: {
            accountId: entityId,
            bankTransactionId: bankTxn.id,
            direction: isIncome ? TxnDirection.INCOME : TxnDirection.EXPENSE,
            amountPence: Math.abs(t.amountPence),
            date: new Date(t.date),
            description: t.description,
            category: null,
            source: TxnSource.BANK_FEED,
            status: TxnStatus.UNRECONCILED,
          },
        });
        imported++;

        if (opts.notify && isIncome) {
          await createPaymentReceivedNotifications(entityId, {
            amountPence: Math.abs(t.amountPence),
            description: t.description,
          });
          notified++;
        }
      } catch (e) {
        // A concurrent ingest already imported this txn — safe to skip.
        if (isUniqueViolation(e)) continue;
        throw e;
      }
    }
  }

  return { imported, notified };
}
