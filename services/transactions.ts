import { prisma } from "@/lib/db";
import { TxnDirection, TxnStatus } from "@/lib/enums";
import type { Prisma } from "@prisma/client";

export interface TransactionFilters {
  propertyId?: string;
  category?: string;
  direction?: string;
  status?: string;
  uncategorisedOnly?: boolean;
}

export async function listTransactions(
  entityId: string,
  filters: TransactionFilters = {},
) {
  const where: Prisma.TransactionWhereInput = {
    accountId: entityId,
  };
  if (filters.propertyId) where.propertyId = filters.propertyId;
  if (filters.direction) where.direction = filters.direction;
  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.uncategorisedOnly) where.category = null;

  const [transactions, properties] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { property: { select: { addressLine1: true } } },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.property.findMany({
      where: { accountId: entityId, archivedAt: null },
      select: { id: true, addressLine1: true },
      orderBy: { addressLine1: "asc" },
    }),
  ]);

  const incomePence = transactions
    .filter((t) => t.direction === TxnDirection.INCOME)
    .reduce((s, t) => s + t.amountPence, 0);
  const expensePence = transactions
    .filter((t) => t.direction === TxnDirection.EXPENSE)
    .reduce((s, t) => s + t.amountPence, 0);
  const uncategorised = transactions.filter((t) => !t.category).length;

  return {
    transactions,
    properties,
    totals: { incomePence, expensePence, uncategorised },
  };
}

/** Unreconciled bank-feed transactions that still need attention. */
export async function listUnreconciled(entityId: string) {
  return prisma.transaction.findMany({
    where: { accountId: entityId, status: TxnStatus.UNRECONCILED },
    include: { property: { select: { addressLine1: true } } },
    orderBy: { date: "desc" },
    take: 100,
  });
}
