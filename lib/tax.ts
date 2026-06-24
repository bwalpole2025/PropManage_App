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

/** £1,000 property income allowance, in pence. */
export const PROPERTY_ALLOWANCE_PENCE = 100_000;

export type TaxBand = "BASIC" | "HIGHER" | "ADDITIONAL";

export const TaxBandRate: Record<TaxBand, number> = {
  BASIC: 0.2,
  HIGHER: 0.4,
  ADDITIONAL: 0.45,
};

export const TaxBandLabel: Record<TaxBand, string> = {
  BASIC: "Basic rate (20%)",
  HIGHER: "Higher rate (40%)",
  ADDITIONAL: "Additional rate (45%)",
};

/** Basic-rate restriction applied to residential finance costs. */
const FINANCE_COST_RELIEF_RATE = 0.2;

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

export interface TaxEstimateResult {
  taxYear: string;
  boxBreakdown: Record<string, number>;
  totalIncomePence: number;
  totalAllowableExpensesPence: number;
  financeCostsPence: number;
  financeCostTaxReductionPence: number;
  propertyAllowanceUsedPence: number;
  taxableProfitPence: number;
  estimatedTaxPence: number;
  usedPropertyAllowance: boolean;
  taxBand: TaxBand;
  landlordType: LandlordType;
  disclaimer: string;
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
    propertyAllowanceUsed = Math.min(PROPERTY_ALLOWANCE_PENCE, totalIncome);
    boxBreakdown[Sa105Box.PROPERTY_INCOME_ALLOW] = propertyAllowanceUsed;
    allowableExpenses = 0;
    taxableProfit = Math.max(0, totalIncome - propertyAllowanceUsed);
  } else {
    taxableProfit = Math.max(0, totalIncome - allowableExpenses);
    if (!isCompany && financeCosts > 0) {
      // Relief base capped at the lower of finance costs and taxable profit.
      const reliefBase = Math.min(financeCosts, taxableProfit);
      financeCostTaxReduction = Math.round(reliefBase * FINANCE_COST_RELIEF_RATE);
    }
  }

  const grossTax = Math.round(taxableProfit * TaxBandRate[taxBand]);
  const estimatedTax = Math.max(0, grossTax - financeCostTaxReduction);

  return {
    taxYear,
    boxBreakdown,
    totalIncomePence: totalIncome,
    totalAllowableExpensesPence: allowableExpenses,
    financeCostsPence: financeCosts,
    financeCostTaxReductionPence: financeCostTaxReduction,
    propertyAllowanceUsedPence: propertyAllowanceUsed,
    taxableProfitPence: taxableProfit,
    estimatedTaxPence: estimatedTax,
    usedPropertyAllowance: useAllowance,
    taxBand,
    landlordType,
    disclaimer: TAX_DISCLAIMER,
  };
}
