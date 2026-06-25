import { prisma } from "@/lib/db";
import { BankConnStatus } from "@/lib/enums";
import { services } from "@/lib/services";
import type { JobPayloads } from "../types";

const NINETY_DAYS = 90 * 86_400_000;

/**
 * Poll the (mock) bank feed for active connections and upsert raw
 * BankTransaction rows by their provider id — the raw items the Reconcile
 * screen later matches to domain Transactions.
 */
export async function pollBankFeed(data: JobPayloads["pollBankFeed"]) {
  const connections = await prisma.bankConnection.findMany({
    where: {
      status: BankConnStatus.ACTIVE,
      ...(data.entityId ? { accountId: data.entityId } : {}),
    },
    include: { accounts: true },
  });

  const to = new Date();
  const from = new Date(to.getTime() - NINETY_DAYS);
  let imported = 0;

  for (const conn of connections) {
    for (const account of conn.accounts) {
      const { transactions } = await services.bankFeed.listTransactions({
        accountId: account.providerAccountId,
        from: from.toISOString(),
        to: to.toISOString(),
      });
      for (const t of transactions) {
        await prisma.bankTransaction.upsert({
          where: { providerTxnId: t.providerTxnId },
          create: {
            bankAccountId: account.id,
            providerTxnId: t.providerTxnId,
            amountPence: t.amountPence,
            date: new Date(t.date),
            description: t.description,
            rawCategory: t.rawCategory ?? null,
          },
          update: {},
        });
        imported++;
      }
    }
  }

  console.log(
    `[jobs] pollBankFeed: ${connections.length} connection(s), ${imported} item(s) upserted`,
  );
}
