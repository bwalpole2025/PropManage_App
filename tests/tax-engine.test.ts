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
  it("outputs taxable income, allowable expenses and a property-only estimate", () => {
    const r = computeTaxEstimate(YEAR, [
      txn(Sa105Category.RENT_INCOME, 1_200_000),
      txn(Sa105Category.REPAIRS_MAINTENANCE, 200_000),
    ]);
    expect(r.totalIncomePence).toBe(1_200_000);
    expect(r.totalAllowableExpensesPence).toBe(200_000);
    expect(r.taxableProfitPence).toBe(1_000_000);
    // Property treated as the only income: £10,000 profit < £12,570 personal
    // allowance ⇒ no tax (the old flat 20%-of-everything was an over-estimate).
    expect(r.progressive).toBe(true);
    expect(r.personalAllowanceUsedPence).toBe(1_000_000);
    expect(r.estimatedTaxPence).toBe(0);
  });

  it("applies the personal allowance then the basic rate (progressive)", () => {
    // £30,000 profit: £12,570 tax-free, £17,430 @ 20% = £3,486.
    const r = computeTaxEstimate(YEAR, [txn(Sa105Category.RENT_INCOME, 3_000_000)]);
    expect(r.personalAllowanceUsedPence).toBe(1_257_000);
    expect(r.estimatedTaxPence).toBe(348_600);
    expect(r.taxBand).toBe("BASIC");
  });

  it("crosses into the higher-rate band progressively", () => {
    // £60,000 profit: PA £12,570; £37,700 @ 20% (£7,540) + £9,730 @ 40% (£3,892).
    const r = computeTaxEstimate(YEAR, [txn(Sa105Category.RENT_INCOME, 6_000_000)]);
    expect(r.estimatedTaxPence).toBe(1_143_200);
    expect(r.taxBand).toBe("HIGHER");
    expect(r.bandSlices.map((s) => s.band)).toEqual(["BASIC", "HIGHER"]);
  });

  it("tapers the personal allowance over £100k and reaches the additional rate", () => {
    // £150,000 profit: PA tapered to £0; 37,700@20 + 87,440@40 + 24,860@45 = £53,703.
    const r = computeTaxEstimate(YEAR, [txn(Sa105Category.RENT_INCOME, 15_000_000)]);
    expect(r.personalAllowanceUsedPence).toBe(0);
    expect(r.estimatedTaxPence).toBe(5_370_300);
    expect(r.taxBand).toBe("ADDITIONAL");
  });

  it("honours an explicit marginal band as a flat rate (other income assumed)", () => {
    // With a band chosen, the property profit is taxed flat at that rate (no PA).
    const r = computeTaxEstimate(YEAR, [txn(Sa105Category.RENT_INCOME, 3_000_000)], {
      taxBand: "BASIC",
    });
    expect(r.progressive).toBe(false);
    expect(r.personalAllowanceUsedPence).toBe(0);
    expect(r.estimatedTaxPence).toBe(600_000); // 20% of £30,000
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
