// Derived property-finance figures. Computed, never stored — both inputs mutate
// independently (rent/valuation/mortgage balance), so a stored copy would drift.
// Percentages are returned in basis points (Int), consistent with the rest of
// the codebase (ownershipPercentageBp, interestRateBp).

import { RentPeriodsPerYear, type RentFrequency } from "./enums";

/** Annualise a rent amount (pence) given its frequency. */
export function annualisedRentPence(
  rentPence: number,
  frequency: RentFrequency,
): number {
  return rentPence * (RentPeriodsPerYear[frequency] ?? 12);
}

/**
 * Gross annual yield = annual rent / current valuation, in basis points.
 * Returns null when valuation is missing/zero.
 */
export function annualYieldBp(
  annualRentPence: number,
  valuationPence: number | null | undefined,
): number | null {
  if (!valuationPence || valuationPence <= 0) return null;
  return Math.round((annualRentPence / valuationPence) * 10000);
}

/**
 * Loan-to-value = mortgage balance / current valuation, in basis points.
 * Returns null when valuation is missing/zero.
 */
export function loanToValueBp(
  balancePence: number,
  valuationPence: number | null | undefined,
): number | null {
  if (!valuationPence || valuationPence <= 0) return null;
  return Math.round((balancePence / valuationPence) * 10000);
}

/** Format basis points as a percent string, e.g. 425 -> "4.25%". */
export function formatBpPercent(bp: number | null, dp = 2): string {
  if (bp === null) return "—";
  return `${(bp / 100).toFixed(dp)}%`;
}
