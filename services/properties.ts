import { prisma } from "@/lib/db";
import { TenancyStatus, TxnDirection, TxnStatus } from "@/lib/enums";
import {
  computePropertyHeaderMetrics,
  normaliseMonthlyRentPence,
} from "@/lib/property-finance";
import { computePnl } from "@/lib/portfolio";
import {
  recentTaxYears,
  taxYearEndDate,
  taxYearLabelFor,
  taxYearStartDate,
} from "@/lib/format";

export interface PropertyListItem {
  id: string;
  addressLine1: string;
  city: string;
  postcode: string;
  propertyType: string;
  activeTenancies: number;
  monthlyRentPence: number;
  hasArrears: boolean;
  complianceDueSoon: number;
}

/** Properties for an entity with summary stats for the list view. */
export async function listProperties(
  entityId: string,
): Promise<PropertyListItem[]> {
  const properties = await prisma.property.findMany({
    where: { accountId: entityId, archivedAt: null },
    include: {
      tenancies: {
        include: {
          rentSchedule: {
            where: { status: { in: ["OVERDUE", "PARTIAL"] } },
            select: { id: true },
          },
        },
      },
      documents: {
        where: {
          expiryDate: { not: null, lte: new Date(Date.now() + 30 * 86400000) },
        },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return properties.map((p) => {
    const active = p.tenancies.filter((t) => t.status === TenancyStatus.ACTIVE);
    const monthly = normaliseMonthlyRentPence(p.tenancies);
    const hasArrears = p.tenancies.some((t) => t.rentSchedule.length > 0);
    return {
      id: p.id,
      addressLine1: p.addressLine1,
      city: p.city,
      postcode: p.postcode,
      propertyType: p.propertyType,
      activeTenancies: active.length,
      monthlyRentPence: monthly,
      hasArrears,
      complianceDueSoon: p.documents.length,
    };
  });
}

/** Full property detail, scoped to the entity (returns null if not found). */
export async function getProperty(entityId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    // `archivedAt: undefined` is the soft-delete escape hatch so the kept
    // sub-routes (tenancies/compliance/owners) still load — and their
    // "Review all" links don't 404 — for an archived property, consistent
    // with the detail page + transactions sub-route.
    where: { id: propertyId, accountId: entityId, archivedAt: undefined },
    include: {
      tenancies: {
        include: { tenants: true, rentSchedule: { orderBy: { dueDate: "desc" }, take: 6 } },
        orderBy: { startDate: "desc" },
      },
      transactions: { orderBy: { date: "desc" }, take: 10 },
      documents: {
        where: { expiryDate: { not: null } },
        orderBy: { expiryDate: "asc" },
      },
      ownerships: { include: { beneficialOwner: true } },
    },
  });
  if (!property) return null;

  const incomePence = property.transactions
    .filter((t) => t.direction === TxnDirection.INCOME)
    .reduce((s, t) => s + t.amountPence, 0);
  const expensePence = property.transactions
    .filter((t) => t.direction === TxnDirection.EXPENSE)
    .reduce((s, t) => s + t.amountPence, 0);

  return {
    ...property,
    reminderOffsets: property.documents.map((c) => c.reminderOffsetsDays),
    summary: { incomePence, expensePence },
  };
}

/** Beneficial owners belonging to an entity (for ownership-split selection). */
export async function listOwners(entityId: string) {
  return prisma.beneficialOwner.findMany({
    where: { accountId: entityId },
    orderBy: { legalName: "asc" },
  });
}

/** Portfolios for an entity (for the property's editable Portfolio metric). */
export async function listPortfolios(entityId: string) {
  return prisma.portfolio.findMany({
    where: { accountId: entityId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Rich detail for the property page: the property + every related record needed
 * by the three sub-tabs, plus derived header metrics, a 12-month P&L and a
 * per-tax-year income/expense breakdown. Scoped by id + accountId. Uses the
 * soft-delete escape hatch (`archivedAt: undefined`) so an ARCHIVED property
 * still loads its detail (for the archived banner + restore). Every query is
 * filtered by both propertyId and accountId.
 */
export async function getPropertyDetail(entityId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, accountId: entityId, archivedAt: undefined },
    include: {
      portfolio: { select: { id: true, name: true } },
      tenancies: {
        include: {
          tenants: true,
          rentSchedule: { orderBy: { dueDate: "desc" }, take: 6 },
        },
        orderBy: { startDate: "desc" },
      },
      mortgages: { where: { archivedAt: null }, orderBy: { lender: "asc" } },
      valuations: { orderBy: { date: "desc" } },
      documents: {
        orderBy: [{ expiryDate: "asc" }],
        include: { file: { select: { id: true, filename: true } } },
      },
      notes: { orderBy: { date: "desc" } },
      ownerships: { include: { beneficialOwner: true } },
    },
  });
  if (!property) return null;

  const now = new Date();
  const since12m = new Date(now.getTime() - 365 * 86_400_000);
  const currentTaxYear = taxYearLabelFor(now);
  const taxYearStart = taxYearStartDate(currentTaxYear);

  // Property-scoped transactions: the latest 50 for the table, plus a windowed
  // categorised non-excluded set for the P&L.
  const [recentTxns, pnlTxns] = await Promise.all([
    prisma.transaction.findMany({
      where: { propertyId, accountId: entityId },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.transaction.findMany({
      where: {
        propertyId,
        accountId: entityId,
        date: { gte: since12m },
        status: { not: TxnStatus.EXCLUDED },
        category: { not: null },
      },
      select: { direction: true, amountPence: true, date: true },
    }),
  ]);
  const pnl12m = computePnl(pnlTxns, { taxYearStart });

  // Per-tax-year income/expense/profit for the last 4 tax years. Exclusive
  // end-of-day bound so timestamped 5-Apr transactions stay in-window.
  const years = recentTaxYears(4);
  const perYearGroups = await Promise.all(
    years.map((label) => {
      const start = taxYearStartDate(label);
      const endExclusive = new Date(taxYearEndDate(label).getTime() + 86_400_000);
      return prisma.transaction.groupBy({
        by: ["direction"],
        where: {
          propertyId,
          accountId: entityId,
          date: { gte: start, lt: endExclusive },
          status: { not: TxnStatus.EXCLUDED },
        },
        _sum: { amountPence: true },
      });
    }),
  );
  const perTaxYear = years.map((label, i) => {
    let incomePence = 0;
    let expensePence = 0;
    for (const g of perYearGroups[i]) {
      if (g.direction === TxnDirection.INCOME)
        incomePence = g._sum.amountPence ?? 0;
      else if (g.direction === TxnDirection.EXPENSE)
        expensePence = g._sum.amountPence ?? 0;
    }
    return { label, incomePence, expensePence, profitPence: incomePence - expensePence };
  });

  const header = computePropertyHeaderMetrics({
    tenancies: property.tenancies,
    mortgages: property.mortgages,
    valuations: property.valuations,
    currentValuePence: property.currentValuePence,
    purchasePricePence: property.purchasePricePence,
  });

  return {
    property,
    header: { ...header, portfolioName: property.portfolio.name, portfolioId: property.portfolio.id },
    pnl12m,
    perTaxYear,
    recentTxns,
    hasTransactions: recentTxns.length > 0,
    taxYearLabel: currentTaxYear,
  };
}
