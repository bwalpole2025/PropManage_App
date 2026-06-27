// Pure SA105-aligned tax estimation. Deterministic, no I/O — the same logic is
// used by the dashboard snapshot, the Tax screen, and the MTD payload builder.
//
// IMPORTANT: this is a simplified estimate for guidance only, NOT tax advice.

import {
  SA105_MAP,
  Sa105Box,
  Sa105Category,
  Sa105CategoryDirection,
} from "./sa105";
import { LandlordType, TxnDirection } from "./enums";
import { getTaxYearConfig, type TaxBand } from "./tax-config";

export type { TaxBand };

/**
 * £1,000 property income allowance, in pence.
 * @deprecated Read `getTaxYearConfig(taxYear).propertyAllowancePence` — kept for
 * backwards-compatible imports.
 */
export const PROPERTY_ALLOWANCE_PENCE =
  getTaxYearConfig("2025-26").propertyAllowancePence;

export const TaxBandLabel: Record<TaxBand, string> = {
  BASIC: "Basic rate (20%)",
  HIGHER: "Higher rate (40%)",
  ADDITIONAL: "Additional rate (45%)",
};

export const TAX_DISCLAIMER =
  "This is an automated estimate to help you plan. It is not tax advice and may " +
  "not reflect your full circumstances. Confirm figures with a qualified accountant.";

export interface TxnForEstimate {
  direction: TxnDirection;
  amountPence: number;
  category?: Sa105Category | null;
}

export interface TaxEstimateOptions {
  usePropertyAllowance?: boolean;
  taxBand?: TaxBand;
  landlordType?: LandlordType;
}

/** One slice of taxable profit taxed at a single band rate. */
export interface TaxBandSlice {
  band: TaxBand;
  amountPence: number; // taxable profit falling in this band
  rate: number; // 0.20 / 0.40 / 0.45
  taxPence: number; // amountPence × rate (rounded)
}

export interface TaxEstimateResult {
  taxYear: string;
  boxBreakdown: Record<string, number>;
  totalIncomePence: number;
  totalAllowableExpensesPence: number;
  financeCostsPence: number;
  financeCostTaxReductionPence: number;
  propertyAllowanceUsedPence: number;
  /** £12,570 personal allowance applied (with taper) — distinct from the £1,000 property allowance. */
  personalAllowanceUsedPence: number;
  taxableProfitPence: number;
  estimatedTaxPence: number;
  /** Per-band breakdown of the income-tax charge (empty for companies / flat-band mode). */
  bandSlices: TaxBandSlice[];
  /** True when the charge was computed progressively (personal allowance + bands). */
  progressive: boolean;
  /** estimatedTax ÷ taxableProfit (0 when no profit) — the blended effective rate. */
  effectiveRate: number;
  usedPropertyAllowance: boolean;
  /** Marginal band reached (progressive) or the explicit band chosen. */
  taxBand: TaxBand;
  landlordType: LandlordType;
  disclaimer: string;
}

/**
 * Progressive UK income tax on a property profit treated as the *only* income:
 * apply the personal allowance (with the £100k taper), then slice the remainder
 * through the basic / higher / additional bands. This is the accurate
 * property-only charge — used when no explicit marginal band is supplied.
 */
function computeProgressiveIncomeTax(
  taxableProfitPence: number,
  cfg: ReturnType<typeof getTaxYearConfig>,
): {
  taxPence: number;
  personalAllowanceUsedPence: number;
  slices: TaxBandSlice[];
  marginalBand: TaxBand;
} {
  // Personal allowance, tapered £1 for every £2 of income over the threshold.
  let personalAllowance = cfg.personalAllowancePence;
  if (taxableProfitPence > cfg.personalAllowanceTaperThresholdPence) {
    const excess = taxableProfitPence - cfg.personalAllowanceTaperThresholdPence;
    personalAllowance = Math.max(0, personalAllowance - Math.floor(excess / 2));
  }
  const personalAllowanceUsed = Math.min(personalAllowance, Math.max(0, taxableProfitPence));
  const taxable = Math.max(0, taxableProfitPence - personalAllowanceUsed);

  // Band widths/thresholds expressed in *taxable* income (after the allowance).
  const basicTop = cfg.basicRateLimitPence; // 20% up to here
  const additionalStart = cfg.additionalRateThresholdPence; // 45% above here
  const rates = cfg.incomeTaxBandRates;

  const basicAmt = Math.min(taxable, basicTop);
  const higherAmt = Math.max(0, Math.min(taxable, additionalStart) - basicTop);
  const additionalAmt = Math.max(0, taxable - additionalStart);

  const slices: TaxBandSlice[] = [];
  const push = (band: TaxBand, amountPence: number) => {
    if (amountPence > 0) {
      slices.push({ band, amountPence, rate: rates[band], taxPence: Math.round(amountPence * rates[band]) });
    }
  };
  push("BASIC", basicAmt);
  push("HIGHER", higherAmt);
  push("ADDITIONAL", additionalAmt);

  const taxPence = slices.reduce((s, b) => s + b.taxPence, 0);
  const marginalBand: TaxBand =
    additionalAmt > 0 ? "ADDITIONAL" : higherAmt > 0 ? "HIGHER" : "BASIC";
  return { taxPence, personalAllowanceUsedPence: personalAllowanceUsed, slices, marginalBand };
}

/**
 * Compute an SA105-aligned estimate from a set of transactions.
 *
 * Key UK rules encoded:
 *  - Mortgage / residential finance costs are NOT a deductible expense for
 *    individuals; instead they earn a 20% basic-rate tax reduction (box 44).
 *    Limited companies deduct them as a normal expense.
 *  - The £1,000 property allowance is mutually exclusive with claiming actual
 *    expenses; when chosen it caps at total income (can't create a loss).
 */
export function computeTaxEstimate(
  taxYear: string,
  transactions: TxnForEstimate[],
  options: TaxEstimateOptions = {},
): TaxEstimateResult {
  const cfg = getTaxYearConfig(taxYear);
  const landlordType = options.landlordType ?? LandlordType.INDIVIDUAL;
  const taxBand = options.taxBand ?? "BASIC";
  const isCompany = landlordType === LandlordType.LIMITED_COMPANY;

  const boxBreakdown: Record<string, number> = {};
  let totalIncome = 0;
  let financeCosts = 0;
  let deductibleExpenses = 0; // expenses excluding finance costs

  for (const txn of transactions) {
    if (!txn.category) continue;
    const box = SA105_MAP[txn.category];
    boxBreakdown[box] = (boxBreakdown[box] ?? 0) + txn.amountPence;

    const direction = Sa105CategoryDirection[txn.category];
    if (direction === TxnDirection.INCOME) {
      totalIncome += txn.amountPence;
    } else if (txn.category === Sa105Category.MORTGAGE_INTEREST) {
      financeCosts += txn.amountPence;
    } else {
      deductibleExpenses += txn.amountPence;
    }
  }

  // For companies, finance costs are an ordinary deductible expense.
  if (isCompany) {
    deductibleExpenses += financeCosts;
  } else if (financeCosts > 0) {
    // Mirror finance costs into the box-44 residential finance cost line.
    boxBreakdown[Sa105Box.RESIDENTIAL_FIN_COST] = financeCosts;
  }

  const useAllowance = !!options.usePropertyAllowance;
  let propertyAllowanceUsed = 0;
  let allowableExpenses = deductibleExpenses;
  let financeCostTaxReduction = 0;
  let taxableProfit: number;

  if (useAllowance) {
    // Property allowance replaces all actual expenses and finance-cost relief.
    propertyAllowanceUsed = Math.min(cfg.propertyAllowancePence, totalIncome);
    boxBreakdown[Sa105Box.PROPERTY_INCOME_ALLOW] = propertyAllowanceUsed;
    allowableExpenses = 0;
    taxableProfit = Math.max(0, totalIncome - propertyAllowanceUsed);
  } else {
    taxableProfit = Math.max(0, totalIncome - allowableExpenses);
    if (!isCompany && financeCosts > 0) {
      // Relief base capped at the lower of finance costs and taxable profit.
      const reliefBase = Math.min(financeCosts, taxableProfit);
      financeCostTaxReduction = Math.round(reliefBase * cfg.financeCostReliefRate);
    }
  }

  // The income-tax (or corporation-tax) charge on the taxable profit:
  //  - Limited companies: flat corporation tax.
  //  - Individuals with an explicit band: flat at that band — the "I have other
  //    income that already uses my allowance and lower bands" assumption.
  //  - Individuals with no band (default): PROGRESSIVE — personal allowance + the
  //    basic/higher/additional bands applied to property profit as the only
  //    income. This is the accurate property-only burden.
  const explicitBand = options.taxBand;
  let grossTax: number;
  let bandSlices: TaxBandSlice[] = [];
  let personalAllowanceUsed = 0;
  let progressive = false;
  let resolvedBand: TaxBand = taxBand;

  if (isCompany) {
    grossTax = Math.round(taxableProfit * cfg.corporationTaxRate);
  } else if (explicitBand) {
    grossTax = Math.round(taxableProfit * cfg.incomeTaxBandRates[explicitBand]);
    resolvedBand = explicitBand;
  } else {
    progressive = true;
    const p = computeProgressiveIncomeTax(taxableProfit, cfg);
    grossTax = p.taxPence;
    bandSlices = p.slices;
    personalAllowanceUsed = p.personalAllowanceUsedPence;
    resolvedBand = p.marginalBand;
  }

  const estimatedTax = Math.max(0, grossTax - financeCostTaxReduction);
  const effectiveRate = taxableProfit > 0 ? estimatedTax / taxableProfit : 0;

  return {
    taxYear,
    boxBreakdown,
    totalIncomePence: totalIncome,
    totalAllowableExpensesPence: allowableExpenses,
    financeCostsPence: financeCosts,
    financeCostTaxReductionPence: financeCostTaxReduction,
    propertyAllowanceUsedPence: propertyAllowanceUsed,
    personalAllowanceUsedPence: personalAllowanceUsed,
    taxableProfitPence: taxableProfit,
    estimatedTaxPence: estimatedTax,
    bandSlices,
    progressive,
    effectiveRate,
    usedPropertyAllowance: useAllowance,
    taxBand: resolvedBand,
    landlordType,
    disclaimer: TAX_DISCLAIMER,
  };
}
