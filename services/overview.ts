import { prisma } from "@/lib/db";
import { RentFrequency, TenancyStatus, TxnDirection, TxnStatus } from "@/lib/enums";
import { annualisedRentPence, annualYieldBp, loanToValueBp } from "@/lib/finance";
import { getDashboardData, type DashboardData } from "./dashboard";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export interface OverviewData extends DashboardData {
  pnl: {
    incomePence: number;
    expensesPence: number;
    profitPence: number;
    hasTransactions: boolean;
  };
  asset: {
    ltvBp: number | null; // mortgaged-property LTV (Σ balances / Σ values of mortgaged props)
    portfolioValuePence: number;
    portfolioLtvBp: number | null; // Σ balances / Σ all values
    valuationCoveragePct: number;
    purchasePriceCoveragePct: number;
    mortgageCoveragePct: number;
    portfolioDataPct: number; // composite of the three coverages
    totalProperties: number;
  };
  occupancy: {
    occupiedCount: number;
    vacantCount: number;
    availableCount: number;
    fhlCount: number;
    totalProperties: number;
    occupancyPct: number;
  };
  upcoming: {
    tenancyId: string;
    propertyLabel: string;
    tenantName: string;
    dueDate: Date;
    expectedPence: number;
  }[];
  rentCollection: {
    receivedPence: number;
    expectedPence: number;
    collectedPct: number;
    hasSchedule: boolean;
  };
  yields: {
    perProperty: { propertyId: string; label: string; yieldBp: number | null }[];
    portfolioYieldBp: number | null;
  };
  marketRisk: {
    voidRatePct: number;
    arrearsRatePct: number;
    avgLtvBp: number | null;
    level: "low" | "medium" | "high";
  };
}

export async function getOverviewData(
  entityId: string,
  userId?: string,
): Promise<OverviewData> {
  // Reuse the existing dashboard data for onboarding / arrears / compliance / tax.
  const dashboard = await getDashboardData(entityId, userId);

  const now = new Date();
  const yearAgo = new Date(now.getTime() - YEAR_MS);

  const [
    txns,
    properties,
    mortgages,
    valuationProps,
    activeTenancies,
    upcomingRows,
    collectionRows,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        accountId: entityId,
        date: { gte: yearAgo },
        status: { not: TxnStatus.EXCLUDED },
      },
      select: { direction: true, amountPence: true },
    }),
    prisma.property.findMany({
      where: { accountId: entityId },
      select: {
        id: true,
        addressLine1: true,
        currentValuePence: true,
        purchasePricePence: true,
        isFHL: true,
      },
    }),
    prisma.mortgage.findMany({
      where: { accountId: entityId, archivedAt: null },
      select: { propertyId: true, balancePence: true },
    }),
    prisma.valuation.findMany({
      where: { accountId: entityId },
      select: { propertyId: true },
      distinct: ["propertyId"],
    }),
    prisma.tenancy.findMany({
      where: { property: { accountId: entityId }, status: TenancyStatus.ACTIVE },
      select: { propertyId: true, rentPence: true, rentFrequency: true },
    }),
    prisma.rentScheduleEntry.findMany({
      where: {
        dueDate: { gte: now },
        tenancy: {
          status: TenancyStatus.ACTIVE,
          property: { accountId: entityId },
        },
      },
      include: {
        tenancy: {
          include: {
            property: { select: { addressLine1: true } },
            tenants: { where: { isLeadTenant: true }, take: 1 },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.rentScheduleEntry.findMany({
      where: {
        dueDate: { gte: yearAgo },
        tenancy: { property: { accountId: entityId } },
      },
      select: { expectedPence: true, receivedPence: true },
    }),
  ]);

  // --- Profit & Loss (last 12 months) ---
  const incomePence = txns
    .filter((t) => t.direction === TxnDirection.INCOME)
    .reduce((s, t) => s + t.amountPence, 0);
  const expensesPence = txns
    .filter((t) => t.direction === TxnDirection.EXPENSE)
    .reduce((s, t) => s + t.amountPence, 0);
  const pnl = {
    incomePence,
    expensesPence,
    profitPence: incomePence - expensesPence,
    hasTransactions: dashboard.onboarding.hasTransaction,
  };

  // --- Asset analysis ---
  const totalProperties = properties.length;
  const portfolioValuePence = properties.reduce(
    (s, p) => s + (p.currentValuePence ?? 0),
    0,
  );
  const balanceByProp = new Map<string, number>();
  for (const m of mortgages) {
    balanceByProp.set(
      m.propertyId,
      (balanceByProp.get(m.propertyId) ?? 0) + m.balancePence,
    );
  }
  const totalBalance = mortgages.reduce((s, m) => s + m.balancePence, 0);
  const mortgagedValue = properties
    .filter((p) => balanceByProp.has(p.id))
    .reduce((s, p) => s + (p.currentValuePence ?? 0), 0);
  const valuationSet = new Set(valuationProps.map((v) => v.propertyId));
  const pct = (n: number) =>
    totalProperties ? Math.round((n / totalProperties) * 100) : 0;
  const valuationCoveragePct = pct(
    properties.filter((p) => valuationSet.has(p.id)).length,
  );
  const purchasePriceCoveragePct = pct(
    properties.filter((p) => p.purchasePricePence != null).length,
  );
  const mortgageCoveragePct = pct(
    properties.filter((p) => balanceByProp.has(p.id)).length,
  );
  const asset = {
    ltvBp: loanToValueBp(totalBalance, mortgagedValue || null),
    portfolioValuePence,
    portfolioLtvBp: loanToValueBp(totalBalance, portfolioValuePence || null),
    valuationCoveragePct,
    purchasePriceCoveragePct,
    mortgageCoveragePct,
    portfolioDataPct: Math.round(
      (valuationCoveragePct + purchasePriceCoveragePct + mortgageCoveragePct) / 3,
    ),
    totalProperties,
  };

  // --- Occupancy ---
  const occupiedSet = new Set(activeTenancies.map((t) => t.propertyId));
  const occupiedCount = occupiedSet.size;
  const vacantCount = Math.max(0, totalProperties - occupiedCount);
  const occupancy = {
    occupiedCount,
    vacantCount,
    availableCount: vacantCount,
    fhlCount: properties.filter((p) => p.isFHL).length,
    totalProperties,
    occupancyPct: totalProperties
      ? Math.round((occupiedCount / totalProperties) * 100)
      : 0,
  };

  // --- Upcoming payments ---
  const upcoming = upcomingRows.map((e) => ({
    tenancyId: e.tenancyId,
    propertyLabel: e.tenancy.property.addressLine1,
    tenantName: e.tenancy.tenants[0]?.name ?? "Tenant",
    dueDate: e.dueDate,
    expectedPence: e.expectedPence,
  }));

  // --- Rent collection (trailing 12 months) ---
  const expectedPence = collectionRows.reduce((s, r) => s + r.expectedPence, 0);
  const receivedPence = collectionRows.reduce((s, r) => s + r.receivedPence, 0);
  const rentCollection = {
    receivedPence,
    expectedPence,
    collectedPct: expectedPence
      ? Math.round((receivedPence / expectedPence) * 100)
      : 0,
    hasSchedule: collectionRows.length > 0,
  };

  // --- Rental yields ---
  const annualRentByProp = new Map<string, number>();
  for (const t of activeTenancies) {
    annualRentByProp.set(
      t.propertyId,
      (annualRentByProp.get(t.propertyId) ?? 0) +
        annualisedRentPence(t.rentPence, t.rentFrequency as RentFrequency),
    );
  }
  const propsById = new Map(properties.map((p) => [p.id, p]));
  const yields = {
    perProperty: [...annualRentByProp.entries()].map(([propertyId, annual]) => ({
      propertyId,
      label: propsById.get(propertyId)?.addressLine1 ?? "Property",
      yieldBp: annualYieldBp(annual, propsById.get(propertyId)?.currentValuePence),
    })),
    portfolioYieldBp: annualYieldBp(
      [...annualRentByProp.values()].reduce((s, v) => s + v, 0),
      portfolioValuePence || null,
    ),
  };

  // --- Market risk (heuristic from void rate, arrears rate, LTV) ---
  const voidRatePct = occupancy.totalProperties
    ? Math.round((vacantCount / totalProperties) * 100)
    : 0;
  const arrearsRatePct = expectedPence
    ? Math.round((dashboard.kpis.arrearsPence / expectedPence) * 100)
    : 0;
  const avgLtvBp = asset.ltvBp;
  const ltvPct = avgLtvBp == null ? 0 : avgLtvBp / 100;
  const score =
    (voidRatePct < 5 ? 0 : voidRatePct <= 15 ? 1 : 2) +
    (arrearsRatePct < 3 ? 0 : arrearsRatePct <= 10 ? 1 : 2) +
    (avgLtvBp == null || ltvPct < 60 ? 0 : ltvPct <= 75 ? 1 : 2);
  const marketRisk = {
    voidRatePct,
    arrearsRatePct,
    avgLtvBp,
    level: (score <= 1 ? "low" : score <= 3 ? "medium" : "high") as
      | "low"
      | "medium"
      | "high",
  };

  return { ...dashboard, pnl, asset, occupancy, upcoming, rentCollection, yields, marketRisk };
}
