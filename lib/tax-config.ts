// Versioned UK tax parameters, keyed by tax year. All rates, allowances and
// thresholds live here (not hardcoded in the engine) so they can be updated and
// audited per year. Money is integer pence; rates are fractions (0.20 = 20%).
//
// rUK (England / Wales / NI) income-tax bands. Sources: HMRC published rates.
// This is a simplified parameter set for guidance only — not tax advice.

export type TaxBand = "BASIC" | "HIGHER" | "ADDITIONAL";

export interface TaxYearConfig {
  taxYearLabel: string;
  /** Property income allowance (replaces actual expenses when claimed). */
  propertyAllowancePence: number;
  /** Basic-rate restriction applied to residential finance costs (a tax reducer). */
  financeCostReliefRate: number;
  /** Income-tax rate by marginal band (rUK). */
  incomeTaxBandRates: Record<TaxBand, number>;
  /** Corporation-tax rate used for limited-company landlords. */
  corporationTaxRate: number;
  /** Standard personal allowance. */
  personalAllowancePence: number;
  /** Taxable income (above the personal allowance) taxed at the basic rate. */
  basicRateLimitPence: number;
  /** Income at which the higher rate begins (personal allowance + basic-rate limit). */
  higherRateThresholdPence: number;
  /** Income at which the additional rate begins. */
  additionalRateThresholdPence: number;
}

const PROPERTY_ALLOWANCE = 100_000; // £1,000 — unchanged across these years
const PERSONAL_ALLOWANCE = 1_257_000; // £12,570 — frozen 2021-22..2027-28
const BASIC_RATE_LIMIT = 3_770_000; // £37,700
const HIGHER_RATE_THRESHOLD = 5_027_000; // £50,270 (PA + basic-rate limit)
const RUK_BANDS: Record<TaxBand, number> = { BASIC: 0.2, HIGHER: 0.4, ADDITIONAL: 0.45 };

const base = {
  propertyAllowancePence: PROPERTY_ALLOWANCE,
  financeCostReliefRate: 0.2,
  incomeTaxBandRates: RUK_BANDS,
  personalAllowancePence: PERSONAL_ALLOWANCE,
  basicRateLimitPence: BASIC_RATE_LIMIT,
  higherRateThresholdPence: HIGHER_RATE_THRESHOLD,
};

/**
 * The versioned table. Years differ where the real parameters did: the
 * additional-rate threshold dropped from £150,000 to £125,140 in 2023-24, and
 * the corporation-tax main rate rose from 19% to 25% in 2023-24.
 */
const CONFIG: Record<string, TaxYearConfig> = {
  "2022-23": {
    taxYearLabel: "2022-23",
    ...base,
    corporationTaxRate: 0.19,
    additionalRateThresholdPence: 15_000_000, // £150,000
  },
  "2023-24": {
    taxYearLabel: "2023-24",
    ...base,
    corporationTaxRate: 0.25,
    additionalRateThresholdPence: 12_514_000, // £125,140
  },
  "2024-25": {
    taxYearLabel: "2024-25",
    ...base,
    corporationTaxRate: 0.25,
    additionalRateThresholdPence: 12_514_000,
  },
  "2025-26": {
    taxYearLabel: "2025-26",
    ...base,
    corporationTaxRate: 0.25,
    additionalRateThresholdPence: 12_514_000,
  },
  "2026-27": {
    taxYearLabel: "2026-27",
    ...base,
    corporationTaxRate: 0.25,
    additionalRateThresholdPence: 12_514_000,
  },
};

/** The most recent configured tax year. */
export const LATEST_TAX_YEAR = "2026-27";

/**
 * Config for a tax-year label. Falls back to the most recent configured year
 * that is not after the requested one (else the latest), so future or unlisted
 * years still resolve to a sensible parameter set carrying the requested label.
 */
export function getTaxYearConfig(taxYearLabel: string): TaxYearConfig {
  const exact = CONFIG[taxYearLabel];
  if (exact) return exact;

  // Oldest first; pick the latest configured year not after the requested one.
  // For a year before all configs, fall back to the earliest configured year.
  const oldestFirst = configuredTaxYears().reverse();
  const requestedStart = Number.parseInt(taxYearLabel.slice(0, 4), 10);
  let best = oldestFirst[0];
  if (!Number.isNaN(requestedStart)) {
    for (const cfg of oldestFirst) {
      if (Number.parseInt(cfg.taxYearLabel.slice(0, 4), 10) <= requestedStart) {
        best = cfg;
      }
    }
  }
  return { ...best, taxYearLabel };
}

/** All configured tax years, newest first (for admin/reference UI). */
export function configuredTaxYears(): TaxYearConfig[] {
  return Object.values(CONFIG).sort((a, b) =>
    b.taxYearLabel.localeCompare(a.taxYearLabel),
  );
}
