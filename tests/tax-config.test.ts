import { describe, it, expect } from "vitest";
import {
  getTaxYearConfig,
  configuredTaxYears,
  LATEST_TAX_YEAR,
} from "@/lib/tax-config";

describe("tax-config (versioned, keyed by tax year)", () => {
  it("returns the exact configured year", () => {
    const cfg = getTaxYearConfig("2025-26");
    expect(cfg.taxYearLabel).toBe("2025-26");
    expect(cfg.propertyAllowancePence).toBe(100_000);
    expect(cfg.incomeTaxBandRates.BASIC).toBe(0.2);
  });

  it("encodes parameters that genuinely differ across years", () => {
    // Corporation-tax main rate rose 19% -> 25% in 2023-24.
    expect(getTaxYearConfig("2022-23").corporationTaxRate).toBe(0.19);
    expect(getTaxYearConfig("2023-24").corporationTaxRate).toBe(0.25);
    // Additional-rate threshold dropped £150,000 -> £125,140 in 2023-24.
    expect(getTaxYearConfig("2022-23").additionalRateThresholdPence).toBe(15_000_000);
    expect(getTaxYearConfig("2023-24").additionalRateThresholdPence).toBe(12_514_000);
  });

  it("falls back to the latest configured year for a future year", () => {
    const cfg = getTaxYearConfig("2030-31");
    expect(cfg.taxYearLabel).toBe("2030-31"); // keeps the requested label
    expect(cfg.corporationTaxRate).toBe(
      getTaxYearConfig(LATEST_TAX_YEAR).corporationTaxRate,
    );
  });

  it("falls back to the earliest configured year for a year before all configs", () => {
    const cfg = getTaxYearConfig("2019-20");
    expect(cfg.corporationTaxRate).toBe(0.19); // earliest = 2022-23
  });

  it("lists configured years newest first", () => {
    const years = configuredTaxYears().map((c) => c.taxYearLabel);
    expect(years[0]).toBe(LATEST_TAX_YEAR);
    expect(years).toContain("2022-23");
  });
});
