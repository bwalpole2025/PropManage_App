import { prisma } from "@/lib/db";
import { RentFrequency, TenancyStatus, TxnDirection, TxnStatus } from "@/lib/enums";
import { annualisedRentPence } from "@/lib/finance";
import { taxYearLabelFor, taxYearStartDate } from "@/lib/format";
import {
  computeAsset,
  computeMarketRisk,
  computePnl,
  computeYields,
  type AssetResult,
  type MarketRiskResult,
  type PnlResult,
  type YieldsResult,
} from "@/lib/portfolio";
import { getDashboardData, type DashboardData } from "./dashboard";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export interface OverviewData extends DashboardData {
  pnl: PnlResult & { hasTransactions: boolean };
  asset: AssetResult;
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
  yields: YieldsResult;
  marketRisk: MarketRiskResult;
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
    activeTenancies,
    upcomingRows,
    collectionRows,
    rentalPaymentCount,
  ] = await Promise.all([
    // Categorised, non-excluded transactions in the last 12 months.
    prisma.transaction.findMany({
      where: {
        accountId: entityId,
        date: { gte: yearAgo },
        status: { not: TxnStatus.EXCLUDED },
        category: { not: null },
      },
      select: { direction: true, amountPence: true, date: true },
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
    // A rental payment of ANY age unlocks the yields widget.
    prisma.transaction.count({
      where: {
        accountId: entityId,
        direction: TxnDirection.INCOME,
        status: { not: TxnStatus.EXCLUDED },
      },
    }),
  ]);

  const taxYearLabel = taxYearLabelFor();
  const taxYearStart = taxYearStartDate(taxYearLabel);

  // --- Profit & Loss (last 12 months + current tax year) ---
  const pnl = {
    ...computePnl(txns, { taxYearStart }),
    hasTransactions: dashboard.onboarding.hasTransaction,
  };

  // --- Asset analysis + Market risk ---
  const asset = computeAsset(properties, mortgages);
  const marketRisk = computeMarketRisk(properties);

  // --- Occupancy ---
  const occupiedSet = new Set(activeTenancies.map((t) => t.propertyId));
  const occupiedCount = occupiedSet.size;
  const totalProperties = properties.length;
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

  // --- Rental yields (on purchase price) ---
  const annualRentByProp = new Map<string, number>();
  for (const t of activeTenancies) {
    annualRentByProp.set(
      t.propertyId,
      (annualRentByProp.get(t.propertyId) ?? 0) +
        annualisedRentPence(t.rentPence, t.rentFrequency as RentFrequency),
    );
  }
  const yields = computeYields(
    properties.map((p) => ({
      id: p.id,
      label: p.addressLine1,
      purchasePricePence: p.purchasePricePence,
    })),
    annualRentByProp,
    {
      hasRentalPayment: rentalPaymentCount > 0,
      hasPurchasePrices: properties.some((p) => p.purchasePricePence != null),
      taxYearLabel,
    },
  );

  return { ...dashboard, pnl, asset, occupancy, upcoming, rentCollection, yields, marketRisk };
}
