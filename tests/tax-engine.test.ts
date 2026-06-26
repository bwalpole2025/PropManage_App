import { describe, it, expect } from "vitest";
import { computeTaxEstimate } from "@/lib/tax";
import {
  apportionTxnsByOwnership,
  type ApportionTxn,
  type OwnerShare,
} from "@/lib/ownership";
import { Sa105Category } from "@/lib/sa105";
import { LandlordType, TxnDirection } from "@/lib/enums";

const YEAR = "2025-26";

const txn = (category: Sa105Category, amountPence: number): ApportionTxn => ({
  propertyId: "prop-1",
  direction:
    category === Sa105Category.RENT_INCOME ||
    category === Sa105Category.OTHER_INCOME
      ? TxnDirection.INCOME
      : TxnDirection.EXPENSE,
  amountPence,
  category,
});

describe("tax engine — acceptance behaviours", () => {
  it("outputs taxable income, allowable expenses and an estimate for a property", () => {
    const r = computeTaxEstimate(YEAR, [
      txn(Sa105Category.RENT_INCOME, 1_200_000),
      txn(Sa105Category.REPAIRS_MAINTENANCE, 200_000),
    ]);
    expect(r.totalIncomePence).toBe(1_200_000);
    expect(r.totalAllowableExpensesPence).toBe(200_000);
    expect(r.taxableProfitPence).toBe(1_000_000);
    expect(r.estimatedTaxPence).toBe(200_000); // 20% of £10,000
  });

  it("changing a transaction's category changes the result", () => {
    // A higher-rate landlord, where the finance-cost restriction genuinely bites
    // (at the basic rate a deduction and a 20% reducer net to the same tax).
    const opts = { taxBand: "HIGHER" as const };
    const before = computeTaxEstimate(
      YEAR,
      [
        txn(Sa105Category.RENT_INCOME, 1_200_000),
        txn(Sa105Category.REPAIRS_MAINTENANCE, 300_000),
      ],
      opts,
    );

    // Re-categorise the £3,000 repair as a mortgage-interest finance cost.
    const after = computeTaxEstimate(
      YEAR,
      [
        txn(Sa105Category.RENT_INCOME, 1_200_000),
        txn(Sa105Category.MORTGAGE_INTEREST, 300_000),
      ],
      opts,
    );

    expect(after).not.toStrictEqual(before);
    // Finance costs are NOT deducted, so allowable expenses drop to 0 and the
    // taxable profit rises; only a basic-rate (20%) reducer applies.
    expect(before.totalAllowableExpensesPence).toBe(300_000);
    expect(after.totalAllowableExpensesPence).toBe(0);
    expect(after.taxableProfitPence).toBeGreaterThan(before.taxableProfitPence);
    expect(after.financeCostTaxReductionPence).toBe(60_000); // 20% of £3,000
    expect(before.estimatedTaxPence).toBe(360_000); // 40% of £9,000
    expect(after.estimatedTaxPence).toBe(420_000); // 40% of £12,000 − £600 reducer
    expect(after.estimatedTaxPence).not.toBe(before.estimatedTaxPence);
  });

  it("limited companies are taxed at the versioned corporation-tax rate", () => {
    const r = computeTaxEstimate(YEAR, [txn(Sa105Category.RENT_INCOME, 1_000_000)], {
      landlordType: LandlordType.LIMITED_COMPANY,
    });
    expect(r.estimatedTaxPence).toBe(250_000); // 25% of £10,000 (CT), not 20%
  });

  it("per-owner splits sum to the account total", () => {
    const txns = [
      txn(Sa105Category.RENT_INCOME, 1_000_000),
      txn(Sa105Category.REPAIRS_MAINTENANCE, 300_000),
    ];
    const account = computeTaxEstimate(YEAR, txns);

    // Property fully owned: 70% / 30%.
    const shares: OwnerShare[] = [
      { beneficialOwnerId: "owner-a", bp: 7000 },
      { beneficialOwnerId: "owner-b", bp: 3000 },
    ];
    const byOwner = apportionTxnsByOwnership(txns, new Map([["prop-1", shares]]));

    const estimates = [...byOwner.values()].map((ts) =>
      computeTaxEstimate(YEAR, ts),
    );
    const sumIncome = estimates.reduce((s, e) => s + e.totalIncomePence, 0);
    const sumExpenses = estimates.reduce(
      (s, e) => s + e.totalAllowableExpensesPence,
      0,
    );

    expect(sumIncome).toBe(account.totalIncomePence);
    expect(sumExpenses).toBe(account.totalAllowableExpensesPence);
  });
});
