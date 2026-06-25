import { describe, it, expect } from "vitest";
import { computeTaxEstimate, PROPERTY_ALLOWANCE_PENCE } from "@/lib/tax";
import { Sa105Category } from "@/lib/sa105";
import { LandlordType, TxnDirection } from "@/lib/enums";

const rent = (p: number) => ({
  direction: TxnDirection.INCOME,
  amountPence: p,
  category: Sa105Category.RENT_INCOME,
});
const interest = (p: number) => ({
  direction: TxnDirection.EXPENSE,
  amountPence: p,
  category: Sa105Category.MORTGAGE_INTEREST,
});
const repairs = (p: number) => ({
  direction: TxnDirection.EXPENSE,
  amountPence: p,
  category: Sa105Category.REPAIRS_MAINTENANCE,
});

describe("computeTaxEstimate", () => {
  it("individual: finance costs are NOT deducted but give a 20% basic-rate reduction", () => {
    const r = computeTaxEstimate("2025-26", [rent(1_000_000), interest(200_000)], {
      landlordType: LandlordType.INDIVIDUAL,
      taxBand: "BASIC",
    });
    expect(r.totalAllowableExpensesPence).toBe(0); // interest excluded from deductible
    expect(r.financeCostsPence).toBe(200_000);
    expect(r.taxableProfitPence).toBe(1_000_000);
    expect(r.financeCostTaxReductionPence).toBe(40_000); // 20% of min(200k, 1m)
    expect(r.estimatedTaxPence).toBe(200_000 - 40_000); // 20% of 1m, minus 40k = 160k
    expect(r.boxBreakdown["box44"]).toBe(200_000); // residential finance cost line
    expect(r.disclaimer).toBeTruthy();
  });

  it("limited company: finance costs ARE an ordinary deductible expense", () => {
    const r = computeTaxEstimate("2025-26", [rent(1_000_000), interest(200_000)], {
      landlordType: LandlordType.LIMITED_COMPANY,
    });
    expect(r.totalAllowableExpensesPence).toBe(200_000);
    expect(r.financeCostTaxReductionPence).toBe(0);
    expect(r.taxableProfitPence).toBe(800_000);
  });

  it("deductible expenses reduce the taxable profit", () => {
    const r = computeTaxEstimate("2025-26", [rent(1_000_000), repairs(150_000)], {
      landlordType: LandlordType.INDIVIDUAL,
    });
    expect(r.totalAllowableExpensesPence).toBe(150_000);
    expect(r.taxableProfitPence).toBe(850_000);
  });

  it("property allowance caps at income and replaces actual expenses", () => {
    const r = computeTaxEstimate("2025-26", [rent(80_000), interest(50_000)], {
      usePropertyAllowance: true,
    });
    expect(PROPERTY_ALLOWANCE_PENCE).toBe(100_000);
    expect(r.propertyAllowanceUsedPence).toBe(80_000); // min(£1,000, income £800)
    expect(r.taxableProfitPence).toBe(0);
  });
});
