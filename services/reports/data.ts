// Shared prisma data access for the reports. Centralises the two things every
// report needs to get right: tenant-scoping by accountId, and portfolio-scoping
// (transactions belong to a portfolio only via their property; property-less
// transactions fall into the account's default portfolio — see schema comment on
// Portfolio). Builders call these helpers and then shape a ReportDocument.

import { prisma } from "@/lib/db";
import { TxnStatus } from "@/lib/enums";
import type { Prisma } from "@prisma/client";
import type { ReportFilters } from "@/lib/reports/filters";

export async function getReportEntity(entityId: string) {
  return prisma.account.findUniqueOrThrow({
    where: { id: entityId },
    select: { id: true, displayName: true, type: true },
  });
}

export async function getPortfolios(entityId: string) {
  return prisma.portfolio.findMany({
    where: { accountId: entityId },
    select: { id: true, name: true, isDefault: true, companyId: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getCompanies(entityId: string) {
  return prisma.company.findMany({
    where: { accountId: entityId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export interface PortfolioScope {
  /** null = no property restriction (all portfolios). */
  propertyIds: string[] | null;
  /** Whether property-less transactions are in scope (true for the default portfolio / all). */
  includeNullProperty: boolean;
  /** Display name for the meta line. */
  name: string;
}

/** Resolve the portfolio filter into a concrete property-id scope. */
export async function resolvePortfolioScope(
  entityId: string,
  portfolioId: string | undefined,
): Promise<PortfolioScope> {
  if (!portfolioId) {
    return { propertyIds: null, includeNullProperty: true, name: "All portfolios" };
  }
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, accountId: entityId },
    select: { id: true, name: true, isDefault: true },
  });
  if (!portfolio) {
    // Unknown/foreign portfolio id — fall back to all rather than leaking nothing.
    return { propertyIds: null, includeNullProperty: true, name: "All portfolios" };
  }
  const properties = await prisma.property.findMany({
    where: { accountId: entityId, portfolioId: portfolio.id },
    select: { id: true },
  });
  return {
    propertyIds: properties.map((p) => p.id),
    includeNullProperty: portfolio.isDefault,
    name: portfolio.name,
  };
}

export interface ScopedTxn {
  id: string;
  date: Date;
  rentDueDate: Date | null;
  direction: string;
  amountPence: number;
  category: string | null;
  subcategory: string | null;
  description: string;
  merchant: string | null;
  status: string;
  propertyId: string | null;
  propertyLabel: string | null;
  portfolioName: string | null;
  tenancyId: string | null;
  tenantName: string | null;
}

export interface TxnQuery {
  filters: ReportFilters;
  scope: PortfolioScope;
  /** Restrict to one direction (INCOME/EXPENSE). */
  direction?: string;
  /** Restrict to one stored category string. */
  category?: string;
  /** Restrict to a set of stored category strings. */
  categoryIn?: string[];
  /** Include EXCLUDED (deactivated) transactions; default false. */
  includeExcluded?: boolean;
}

/** Build the prisma where-clause for a scoped transaction query. */
export function txnWhere(entityId: string, q: TxnQuery): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { accountId: entityId };

  const { from, to } = q.filters.period;
  if (from || to) {
    where.date = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  if (!q.includeExcluded) where.status = { not: TxnStatus.EXCLUDED };
  if (q.direction) where.direction = q.direction;
  if (q.category) where.category = q.category;
  if (q.categoryIn) where.category = { in: q.categoryIn };

  if (q.scope.propertyIds !== null) {
    const ids = q.scope.propertyIds;
    where.OR = q.scope.includeNullProperty
      ? [{ propertyId: { in: ids } }, { propertyId: null }]
      : [{ propertyId: { in: ids } }];
  }
  return where;
}

const TXN_INCLUDE = {
  property: { select: { addressLine1: true, portfolio: { select: { name: true } } } },
  tenancy: {
    select: { tenants: { where: { isLeadTenant: true }, select: { name: true }, take: 1 } },
  },
} satisfies Prisma.TransactionInclude;

function mapTxn(
  t: Prisma.TransactionGetPayload<{ include: typeof TXN_INCLUDE }>,
): ScopedTxn {
  return {
    id: t.id,
    date: t.date,
    rentDueDate: t.rentDueDate,
    direction: t.direction,
    amountPence: t.amountPence,
    category: t.category,
    subcategory: t.subcategory,
    description: t.description,
    merchant: t.merchant,
    status: t.status,
    propertyId: t.propertyId,
    propertyLabel: t.property?.addressLine1 ?? null,
    portfolioName: t.property?.portfolio?.name ?? null,
    tenancyId: t.tenancyId,
    tenantName: t.tenancy?.tenants[0]?.name ?? null,
  };
}

/** Fetch scoped, mapped transactions ordered oldest-first (for running balances). */
export async function getScopedTransactions(
  entityId: string,
  q: TxnQuery,
): Promise<ScopedTxn[]> {
  const rows = await prisma.transaction.findMany({
    where: txnWhere(entityId, q),
    include: TXN_INCLUDE,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapTxn);
}
