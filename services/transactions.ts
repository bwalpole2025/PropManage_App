import { prisma } from "@/lib/db";
import { TxnDirection, TxnStatus } from "@/lib/enums";
import { poundsToPence } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export interface TransactionFilters {
  propertyId?: string;
  tenancyId?: string;
  category?: string;
  direction?: string;
  status?: string;
  source?: string;
  bankAccountId?: string;
  minPence?: number;
  maxPence?: number;
  uncategorisedOnly?: boolean;
}

/** Parse URL searchParams into TransactionFilters (shared by the page + export route). */
export function parseTransactionFilters(
  sp: Record<string, string | undefined>,
): TransactionFilters {
  return {
    propertyId: sp.propertyId || undefined,
    tenancyId: sp.tenancyId || undefined,
    category: sp.category || undefined,
    direction: sp.direction || undefined,
    status: sp.status || undefined,
    source: sp.source || undefined,
    bankAccountId: sp.account || undefined,
    minPence: sp.min ? poundsToPence(sp.min) : undefined,
    maxPence: sp.max ? poundsToPence(sp.max) : undefined,
    uncategorisedOnly: sp.uncategorised === "1",
  };
}

export async function listTransactions(
  entityId: string,
  filters: TransactionFilters = {},
) {
  const where: Prisma.TransactionWhereInput = { accountId: entityId };
  if (filters.propertyId) where.propertyId = filters.propertyId;
  if (filters.tenancyId) where.tenancyId = filters.tenancyId;
  if (filters.direction) where.direction = filters.direction;
  if (filters.status) where.status = filters.status;
  if (filters.source) where.source = filters.source;
  if (filters.bankAccountId)
    where.bankTxn = { bankAccountId: filters.bankAccountId };
  if (filters.category) where.category = filters.category;
  if (filters.uncategorisedOnly) where.category = null;
  if (filters.minPence != null || filters.maxPence != null) {
    where.amountPence = {
      ...(filters.minPence != null ? { gte: filters.minPence } : {}),
      ...(filters.maxPence != null ? { lte: filters.maxPence } : {}),
    };
  }

  const [transactions, properties, tenancies, bankAccounts, totalCount] =
    await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          property: { select: { id: true, addressLine1: true } },
          tenancy: {
            select: {
              id: true,
              tenants: {
                where: { isLeadTenant: true },
                select: { name: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { date: "desc" },
        take: 200,
      }),
      prisma.property.findMany({
        where: { accountId: entityId, archivedAt: null },
        select: { id: true, addressLine1: true },
        orderBy: { addressLine1: "asc" },
      }),
      prisma.tenancy.findMany({
        where: { property: { accountId: entityId }, status: "ACTIVE" },
        select: {
          id: true,
          property: { select: { addressLine1: true } },
          tenants: {
            where: { isLeadTenant: true },
            select: { name: true },
            take: 1,
          },
        },
        orderBy: { startDate: "desc" },
      }),
      prisma.bankAccount.findMany({
        where: { connection: { accountId: entityId, status: "ACTIVE" } },
        select: { id: true, name: true, accountNumberMasked: true },
      }),
      prisma.transaction.count({ where: { accountId: entityId } }),
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
    tenancies,
    bankAccounts,
    totalCount,
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
