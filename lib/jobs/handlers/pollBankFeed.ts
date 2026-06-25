import { prisma } from "@/lib/db";
import { BankConnStatus } from "@/lib/enums";
import { expireStaleConnections, ingestBankConnection } from "@/lib/bank-ingest";
import type { JobPayloads } from "../types";

/**
 * Poll the bank feed: first expire any connections whose consent has lapsed,
 * then ingest each ACTIVE connection (upserting raw BankTransactions, creating
 * domain Transactions, and notifying on new incoming payments).
 */
export async function pollBankFeed(data: JobPayloads["pollBankFeed"]) {
  const expired = await expireStaleConnections();

  const connections = await prisma.bankConnection.findMany({
    where: {
      status: BankConnStatus.ACTIVE,
      ...(data.entityId ? { accountId: data.entityId } : {}),
    },
    select: { id: true },
  });

  let imported = 0;
  let notified = 0;
  for (const conn of connections) {
    const r = await ingestBankConnection(conn.id, { notify: true });
    imported += r.imported;
    notified += r.notified;
  }

  console.log(
    `[jobs] pollBankFeed: ${connections.length} connection(s), ${imported} imported, ${notified} notified, ${expired} expired`,
  );
}
