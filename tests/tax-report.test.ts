import { describe, it, expect } from "vitest";
import {
  reportLinesFromBreakdown,
  taxStatementReportToCsv,
  type TaxStatementReport,
} from "@/services/tax-report";
import { Sa105Box } from "@/lib/sa105";

// An individual with mortgage interest: the engine records finance costs in BOTH
// box26 (generic mapping) and box44 (residential reducer), plus a real expense.
const breakdown: Record<string, number> = {
  [Sa105Box.RENTS_RECEIVED]: 1_200_000,
  [Sa105Box.LEGAL_PROFESSIONAL]: 50_000,
  [Sa105Box.FINANCE_COSTS]: 300_000, // box26
  [Sa105Box.RESIDENTIAL_FIN_COST]: 300_000, // box44 (reducer)
  [Sa105Box.PROPERTY_INCOME_ALLOW]: 100_000, // box20.1 (allowance)
};

describe("reportLinesFromBreakdown — SA105 categorisation", () => {
  it("individuals: finance costs and the allowance are NOT expense lines (no double-count)", () => {
    const { incomeLines, expenseLines } = reportLinesFromBreakdown(breakdown, false);
    const boxes = expenseLines.map((l) => l.box);
    expect(incomeLines.map((l) => l.box)).toContain(Sa105Box.RENTS_RECEIVED);
    expect(boxes).toContain(Sa105Box.LEGAL_PROFESSIONAL);
    // The reducer / generic finance / allowance boxes must not appear as expenses.
    expect(boxes).not.toContain(Sa105Box.RESIDENTIAL_FIN_COST);
    expect(boxes).not.toContain(Sa105Box.FINANCE_COSTS);
    expect(boxes).not.toContain(Sa105Box.PROPERTY_INCOME_ALLOW);
    // Only the genuine expense remains, so lines reconcile to the allowable total.
    const sum = expenseLines.reduce((s, l) => s + l.amountPence, 0);
    expect(sum).toBe(50_000);
  });

  it("companies: loan/finance costs ARE an allowable expense line", () => {
    const { expenseLines } = reportLinesFromBreakdown(breakdown, true);
    const boxes = expenseLines.map((l) => l.box);
    expect(boxes).toContain(Sa105Box.FINANCE_COSTS);
    expect(boxes).toContain(Sa105Box.LEGAL_PROFESSIONAL);
    expect(boxes).not.toContain(Sa105Box.RESIDENTIAL_FIN_COST);
    expect(expenseLines.reduce((s, l) => s + l.amountPence, 0)).toBe(350_000);
  });
});

describe("taxStatementReportToCsv", () => {
  const report: TaxStatementReport = {
    taxYear: "2025-26",
    entityName: "Acme Lettings",
    landlordTypeLabel: "Individual",
    txnCount: 3,
    incomeLines: [{ box: "box20", label: "Total rents received", amountPence: 1_200_000 }],
    expenseLines: [{ box: "box27", label: "Legal/professional", amountPence: 50_000 }],
    totalIncomePence: 1_200_000,
    totalAllowableExpensesPence: 50_000,
    taxableProfitPence: 1_150_000,
    financeCostsPence: 0,
    financeCostTaxReductionPence: 0,
    propertyAllowanceUsedPence: 0,
    personalAllowanceUsedPence: 0,
    estimatedTaxPence: 230_000,
    bandSlices: [],
    progressive: false,
    effectiveRate: 0.2,
    owners: [
      {
        id: "o1",
        // A malicious owner name that Excel would treat as a formula.
        legalName: "=HYPERLINK(evil)",
        ownedPropertyCount: 1,
        totalIncomePence: 1_200_000,
        totalAllowableExpensesPence: 50_000,
        taxableProfitPence: 1_150_000,
        estimatedTaxPence: 230_000,
      },
    ],
    config: {
      propertyAllowancePence: 100_000,
      financeCostReliefRate: 0.2,
      appliedRate: 0.2,
      appliedRateLabel: "BASIC rate",
      corporationTaxRate: 0.25,
      personalAllowancePence: 1_257_000,
      higherRateThresholdPence: 5_027_000,
      additionalRateThresholdPence: 12_514_000,
    },
    disclaimer: "This is not tax advice.",
  };

  it("emits SA105 structure with income, expense, summary and owner sections", () => {
    const csv = taxStatementReportToCsv(report);
    expect(csv).toContain("Tax Statement (SA105)");
    expect(csv).toMatch(/\nIncome,box20,Total rents received,12000\.00/);
    expect(csv).toMatch(/\nExpense,box27,/);
    expect(csv).toMatch(/\nEstimated tax,,,2300\.00/);
    expect(csv).toContain("not tax advice");
  });

  it("neutralises spreadsheet formula injection in the owner name", () => {
    const csv = taxStatementReportToCsv(report);
    // The raw formula must be neutralised with a leading apostrophe.
    expect(csv).not.toMatch(/(^|,|")=HYPERLINK/);
    expect(csv).toContain("'=HYPERLINK(evil)");
  });
});
