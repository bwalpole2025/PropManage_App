import { describe, it, expect } from "vitest";
import {
  computeAsset,
  computeMarketRisk,
  computePnl,
  computeYields,
} from "@/lib/portfolio";
import { TxnDirection } from "@/lib/enums";

const txn = (direction: string, amountPence: number, date: Date) => ({
  direction,
  amountPence,
  date,
});

describe("computePnl", () => {
  const taxYearStart = new Date("2026-04-06T00:00:00Z");
  const before = new Date("2026-01-10T00:00:00Z"); // last 12m, before tax year
  const after = new Date("2026-05-01T00:00:00Z"); // within current tax year

  it("buckets income/expenses and computes profit = income − expenses", () => {
    const { last12m } = computePnl(
      [
        txn(TxnDirection.INCOME, 100_000, after),
        txn(TxnDirection.EXPENSE, 30_000, after),
      ],
      { taxYearStart },
    );
    expect(last12m).toEqual({
      incomePence: 100_000,
      expensesPence: 30_000,
      profitPence: 70_000,
    });
  });

  it("limits the tax-year bucket to txns on/after the tax-year start", () => {
    const res = computePnl(
      [
        txn(TxnDirection.INCOME, 100_000, before),
        txn(TxnDirection.INCOME, 40_000, after),
        txn(TxnDirection.EXPENSE, 10_000, after),
      ],
      { taxYearStart },
    );
    expect(res.last12m.incomePence).toBe(140_000); // both incomes
    expect(res.taxYear.incomePence).toBe(40_000); // only the after one
    expect(res.taxYear.profitPence).toBe(30_000);
  });
});

describe("computeAsset", () => {
  const props = [
    { id: "a", currentValuePence: 34_000_000, purchasePricePence: 28_500_000 },
    { id: "b", currentValuePence: 23_500_000, purchasePricePence: 21_000_000 },
  ];
  const mortgages = [{ propertyId: "a", balancePence: 19_500_000 }];

  it("accurate X/Y coverage counts + totals", () => {
    const r = computeAsset(props, mortgages);
    expect(r.totalProperties).toBe(2);
    expect([r.valuationCount, r.purchasePriceCount, r.mortgageCount]).toEqual([
      2, 2, 1,
    ]);
    expect(r.valuationTotalPence).toBe(57_500_000);
    expect(r.purchasePriceTotalPence).toBe(49_500_000);
    expect(r.mortgageBalanceTotalPence).toBe(19_500_000);
  });

  it("portfolio LTV = total balance ÷ total valuation (bp) and % completeness", () => {
    const r = computeAsset(props, mortgages);
    expect(r.ltvBp).toBe(3391); // 19.5m / 57.5m
    expect(r.portfolioDataPct).toBe(83); // round((1 + 1 + 0.5)/3 * 100)
  });

  it("drops a property with no valuation from coverage + LTV denominator", () => {
    const r = computeAsset(
      [
        { id: "a", currentValuePence: 20_000_000, purchasePricePence: 18_000_000 },
        { id: "b", currentValuePence: null, purchasePricePence: null },
      ],
      [{ propertyId: "a", balancePence: 10_000_000 }],
    );
    expect(r.valuationCount).toBe(1);
    expect(r.ltvBp).toBe(5000); // 10m / 20m
  });

  it("guards an empty portfolio", () => {
    const r = computeAsset([], []);
    expect(r.ltvBp).toBeNull();
    expect(r.portfolioDataPct).toBe(0);
  });
});

describe("computeMarketRisk", () => {
  it("computes capital gain over properties with BOTH figures", () => {
    const r = computeMarketRisk([
      { currentValuePence: 34_000_000, purchasePricePence: 28_500_000 },
      { currentValuePence: 23_500_000, purchasePricePence: 21_000_000 },
    ]);
    expect(r.coveredCount).toBe(2);
    expect(r.gainPence).toBe(8_000_000);
    expect(r.gainBp).toBe(1616); // 8m / 49.5m
    expect(r.hasData).toBe(true);
  });

  it("ignores properties missing either figure; hasData false when none qualify", () => {
    const r = computeMarketRisk([
      { currentValuePence: 30_000_000, purchasePricePence: null },
      { currentValuePence: null, purchasePricePence: 25_000_000 },
    ]);
    expect(r.coveredCount).toBe(0);
    expect(r.hasData).toBe(false);
    expect(r.gainBp).toBeNull();
  });
});

describe("computeYields", () => {
  const props = [
    { id: "a", label: "A", purchasePricePence: 28_500_000 },
    { id: "b", label: "B", purchasePricePence: 21_000_000 },
  ];
  const rent = new Map([
    ["a", 1_500_000],
    ["b", 1_776_000],
  ]);

  it("yields on purchase price (cost), per property + portfolio", () => {
    const r = computeYields(props, rent, {
      hasRentalPayment: true,
      hasPurchasePrices: true,
      taxYearLabel: "2026-27",
    });
    expect(r.locked).toBe(false);
    expect(r.perProperty.find((p) => p.propertyId === "a")?.yieldBp).toBe(526); // 1.5m/28.5m
    expect(r.portfolioYieldBp).toBe(662); // 3.276m / 49.5m
  });

  it("locks until BOTH a rental payment and purchase prices exist", () => {
    expect(
      computeYields(props, rent, {
        hasRentalPayment: false,
        hasPurchasePrices: true,
        taxYearLabel: "2026-27",
      }).lockReason,
    ).toBe("no-rent");
    expect(
      computeYields(props, rent, {
        hasRentalPayment: true,
        hasPurchasePrices: false,
        taxYearLabel: "2026-27",
      }).lockReason,
    ).toBe("no-purchase");
    expect(
      computeYields(props, rent, {
        hasRentalPayment: true,
        hasPurchasePrices: true,
        taxYearLabel: "2026-27",
      }).lockReason,
    ).toBeNull();
  });
});
