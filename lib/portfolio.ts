// Pure portfolio aggregations for the financial dashboard widgets. No prisma —
// the service fetches account-scoped rows and delegates here, so the maths
// (coverage ratios, LTV, yields, capital gain) are unit-testable in isolation.

import { TxnDirection } from "./enums";
import { annualYieldBp, loanToValueBp } from "./finance";

// ---------------------------------------------------------------------------
// Profit & Loss
// ---------------------------------------------------------------------------

export interface PnlBucket {
  incomePence: number;
  expensesPence: number;
  profitPence: number;
}
export interface PnlResult {
  last12m: PnlBucket;
  taxYear: PnlBucket;
}

/**
 * Income/Expenses/Profit over the last 12 months and the current tax year.
 * `txns` are already windowed to the last 365 days, categorised (category != null)
 * and non-EXCLUDED by the caller; the tax-year subset is `date >= taxYearStart`.
 */
export function computePnl(
  txns: { direction: string; amountPence: number; date: Date }[],
  opts: { taxYearStart: Date },
): PnlResult {
  const bucket = (rows: typeof txns): PnlBucket => {
    let incomePence = 0;
    let expensesPence = 0;
    for (const t of rows) {
      if (t.direction === TxnDirection.INCOME) incomePence += t.amountPence;
      else expensesPence += t.amountPence;
    }
    return { incomePence, expensesPence, profitPence: incomePence - expensesPence };
  };
  return {
    last12m: bucket(txns),
    taxYear: bucket(
      txns.filter((t) => t.date.getTime() >= opts.taxYearStart.getTime()),
    ),
  };
}

// ---------------------------------------------------------------------------
// Asset analysis
// ---------------------------------------------------------------------------

export interface AssetResult {
  ltvBp: number | null; // total mortgage balance ÷ total valuation (portfolio-wide)
  valuationTotalPence: number;
  valuationCount: number;
  purchasePriceTotalPence: number;
  purchasePriceCount: number;
  mortgageBalanceTotalPence: number;
  mortgageCount: number;
  totalProperties: number;
  portfolioDataPct: number; // % data completeness across the three coverages
}

export function computeAsset(
  properties: {
    id: string;
    currentValuePence: number | null;
    purchasePricePence: number | null;
  }[],
  mortgages: { propertyId: string; balancePence: number }[],
): AssetResult {
  const totalProperties = properties.length;
  const balanceByProp = new Map<string, number>();
  for (const m of mortgages) {
    balanceByProp.set(
      m.propertyId,
      (balanceByProp.get(m.propertyId) ?? 0) + m.balancePence,
    );
  }

  let valuationTotalPence = 0;
  let valuationCount = 0;
  let purchasePriceTotalPence = 0;
  let purchasePriceCount = 0;
  let mortgageBalanceTotalPence = 0;
  let mortgageCount = 0;
  for (const p of properties) {
    if (p.currentValuePence != null) {
      valuationTotalPence += p.currentValuePence;
      valuationCount++;
    }
    if (p.purchasePricePence != null) {
      purchasePriceTotalPence += p.purchasePricePence;
      purchasePriceCount++;
    }
    const bal = balanceByProp.get(p.id);
    if (bal != null) {
      mortgageBalanceTotalPence += bal;
      mortgageCount++;
    }
  }

  const portfolioDataPct =
    totalProperties === 0
      ? 0
      : Math.round(
          ((valuationCount / totalProperties +
            purchasePriceCount / totalProperties +
            mortgageCount / totalProperties) /
            3) *
            100,
        );

  return {
    ltvBp: loanToValueBp(mortgageBalanceTotalPence, valuationTotalPence || null),
    valuationTotalPence,
    valuationCount,
    purchasePriceTotalPence,
    purchasePriceCount,
    mortgageBalanceTotalPence,
    mortgageCount,
    totalProperties,
    portfolioDataPct,
  };
}

// ---------------------------------------------------------------------------
// Market risk — current valuation vs purchase price (capital growth)
// ---------------------------------------------------------------------------

export interface MarketRiskResult {
  valuationTotalPence: number;
  purchasePriceTotalPence: number;
  gainPence: number;
  gainBp: number | null;
  coveredCount: number;
  totalProperties: number;
  hasData: boolean;
}

export function computeMarketRisk(
  properties: {
    currentValuePence: number | null;
    purchasePricePence: number | null;
  }[],
): MarketRiskResult {
  // Only properties with BOTH figures contribute, so the % is honest.
  const covered = properties.filter(
    (p) => p.currentValuePence != null && p.purchasePricePence != null,
  );
  let valuationTotalPence = 0;
  let purchasePriceTotalPence = 0;
  for (const p of covered) {
    valuationTotalPence += p.currentValuePence!;
    purchasePriceTotalPence += p.purchasePricePence!;
  }
  const gainPence = valuationTotalPence - purchasePriceTotalPence;
  return {
    valuationTotalPence,
    purchasePriceTotalPence,
    gainPence,
    gainBp:
      purchasePriceTotalPence > 0
        ? Math.round((gainPence / purchasePriceTotalPence) * 10000)
        : null,
    coveredCount: covered.length,
    totalProperties: properties.length,
    hasData: covered.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Rental yields — expected yield on purchase price (yield on cost)
// ---------------------------------------------------------------------------

export interface YieldsResult {
  perProperty: { propertyId: string; label: string; yieldBp: number | null }[];
  portfolioYieldBp: number | null;
  taxYearLabel: string;
  locked: boolean;
  lockReason: "no-rent" | "no-purchase" | null;
}

export function computeYields(
  properties: { id: string; label: string; purchasePricePence: number | null }[],
  annualRentByProp: Map<string, number>,
  opts: {
    hasRentalPayment: boolean;
    hasPurchasePrices: boolean;
    taxYearLabel: string;
  },
): YieldsResult {
  const perProperty = properties
    .filter((p) => annualRentByProp.has(p.id))
    .map((p) => ({
      propertyId: p.id,
      label: p.label,
      yieldBp: annualYieldBp(annualRentByProp.get(p.id) ?? 0, p.purchasePricePence),
    }));

  let totalRent = 0;
  let totalCost = 0;
  for (const p of properties) {
    if (annualRentByProp.has(p.id) && p.purchasePricePence != null) {
      totalRent += annualRentByProp.get(p.id) ?? 0;
      totalCost += p.purchasePricePence;
    }
  }

  const lockReason: YieldsResult["lockReason"] = !opts.hasRentalPayment
    ? "no-rent"
    : !opts.hasPurchasePrices
      ? "no-purchase"
      : null;

  return {
    perProperty,
    portfolioYieldBp: annualYieldBp(totalRent, totalCost || null),
    taxYearLabel: opts.taxYearLabel,
    locked: lockReason !== null,
    lockReason,
  };
}
