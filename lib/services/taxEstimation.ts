import { computeTaxEstimate, type TaxEstimateResult } from "../tax";
import { SA105_MAP, Sa105Box, Sa105Category } from "../sa105";
import type { PropertyIncomeSummary, TaxEstimationService } from "./types";

/** Deterministic tax estimation. Shared across mock and real modes. */
export class DefaultTaxEstimationService implements TaxEstimationService {
  estimate(input: {
    entityId: string;
    taxYear: string;
    transactions: Parameters<typeof computeTaxEstimate>[1];
    options?: Parameters<typeof computeTaxEstimate>[2];
  }): TaxEstimateResult {
    return computeTaxEstimate(input.taxYear, input.transactions, input.options);
  }

  /** Convert an estimate into the SA105-aligned shape HMRC submits expect. */
  toPropertyIncomeSummary(result: TaxEstimateResult): PropertyIncomeSummary {
    const box = (b: Sa105Box) => result.boxBreakdown[b] ?? 0;
    return {
      taxYear: result.taxYear,
      income: {
        rentIncome: box(SA105_MAP[Sa105Category.RENT_INCOME]),
        premiumsOfLeaseGrant: box(SA105_MAP[Sa105Category.LEASE_PREMIUM]),
        otherPropertyIncome: box(SA105_MAP[Sa105Category.OTHER_INCOME]),
      },
      expenses: {
        premisesRunningCosts: box(Sa105Box.RENT_RATES_INSURANCE),
        repairsAndMaintenance: box(Sa105Box.PROPERTY_REPAIRS),
        financialCosts: box(Sa105Box.FINANCE_COSTS),
        professionalFees: box(Sa105Box.LEGAL_PROFESSIONAL),
        costOfServices: box(Sa105Box.COSTS_SERVICES),
        other: box(Sa105Box.OTHER_EXPENSES),
      },
    };
  }
}
