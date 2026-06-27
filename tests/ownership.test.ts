import { describe, it, expect } from "vitest";
import {
  apportionTxnsByOwnership,
  validateOwnershipTotalBp,
  type ApportionTxn,
  type OwnerShare,
} from "@/lib/ownership";
import { computeTaxEstimate } from "@/lib/tax";
import { Sa105Category, Sa105CategoryDirection } from "@/lib/sa105";
import { TxnDirection } from "@/lib/enums";

const TAX_YEAR = "2025-26";
// One property's transactions: £10,000 rent income + £4,000 repairs (allowable).
const PROP = "prop-1";
const txnsForProperty = (propertyId: string | null): ApportionTxn[] => [
  {
    propertyId,
    direction: Sa105CategoryDirection[Sa105Category.RENT_INCOME],
    amountPence: 1_000_000,
    category: Sa105Category.RENT_INCOME,
  },
  {
    propertyId,
    direction: Sa105CategoryDirection[Sa105Category.REPAIRS_MAINTENANCE],
    amountPence: 400_000,
    category: Sa105Category.REPAIRS_MAINTENANCE,
  },
];

describe("apportionTxnsByOwnership", () => {
  it("a 50% owner gets EXACTLY 50% of taxable income and allowable expenses (acceptance)", () => {
    const full = computeTaxEstimate(TAX_YEAR, txnsForProperty(PROP));
    const map = new Map<string, OwnerShare[]>([
      [PROP, [{ beneficialOwnerId: "owner-A", bp: 5000 }]],
    ]);
    const byOwner = apportionTxnsByOwnership(txnsForProperty(PROP), map);
    const ownerEstimate = computeTaxEstimate(TAX_YEAR, byOwner.get("owner-A")!);

    expect(ownerEstimate.totalIncomePence).toBe(full.totalIncomePence / 2);
    expect(ownerEstimate.totalAllowableExpensesPence).toBe(
      full.totalAllowableExpensesPence / 2,
    );
    // Income £5,000, expenses £2,000 → taxable £3,000, which is below the
    // £12,570 personal allowance ⇒ £0 (property is the owner's only income).
    expect(ownerEstimate.totalIncomePence).toBe(500_000);
    expect(ownerEstimate.totalAllowableExpensesPence).toBe(200_000);
    expect(ownerEstimate.estimatedTaxPence).toBe(0);
  });

  it("splits 70/30 between two owners", () => {
    const map = new Map<string, OwnerShare[]>([
      [
        PROP,
        [
          { beneficialOwnerId: "jordan", bp: 7000 },
          { beneficialOwnerId: "sam", bp: 3000 },
        ],
      ],
    ]);
    const byOwner = apportionTxnsByOwnership(txnsForProperty(PROP), map);
    const jordan = computeTaxEstimate(TAX_YEAR, byOwner.get("jordan")!);
    const sam = computeTaxEstimate(TAX_YEAR, byOwner.get("sam")!);
    expect(jordan.totalIncomePence).toBe(700_000);
    expect(sam.totalIncomePence).toBe(300_000);
    expect(jordan.totalAllowableExpensesPence).toBe(280_000);
    expect(sam.totalAllowableExpensesPence).toBe(120_000);
    // The two owners reconcile to the full property income.
    expect(jordan.totalIncomePence + sam.totalIncomePence).toBe(1_000_000);
  });

  it("excludes untracked (no-property) transactions from every owner", () => {
    const map = new Map<string, OwnerShare[]>([
      [PROP, [{ beneficialOwnerId: "owner-A", bp: 10000 }]],
    ]);
    const byOwner = apportionTxnsByOwnership(txnsForProperty(null), map);
    expect(byOwner.size).toBe(0);
  });

  it("skips a property with no recorded owners", () => {
    const byOwner = apportionTxnsByOwnership(
      txnsForProperty(PROP),
      new Map(),
    );
    expect(byOwner.size).toBe(0);
  });

  it("rounds each share to the nearest pence", () => {
    const odd: ApportionTxn[] = [
      {
        propertyId: PROP,
        direction: TxnDirection.INCOME,
        amountPence: 10001,
        category: Sa105Category.RENT_INCOME,
      },
    ];
    const map = new Map<string, OwnerShare[]>([
      [
        PROP,
        [
          { beneficialOwnerId: "a", bp: 5000 },
          { beneficialOwnerId: "b", bp: 5000 },
        ],
      ],
    ]);
    const byOwner = apportionTxnsByOwnership(odd, map);
    // round(10001 * 0.5) = round(5000.5) = 5001 each (1p over — accepted).
    expect(byOwner.get("a")![0].amountPence).toBe(5001);
    expect(byOwner.get("b")![0].amountPence).toBe(5001);
  });
});

describe("validateOwnershipTotalBp", () => {
  it("rejects assignments that exceed 100%", () => {
    expect(validateOwnershipTotalBp(7000, 3001).ok).toBe(false);
    expect(validateOwnershipTotalBp(7000, 3000).ok).toBe(true);
    expect(validateOwnershipTotalBp(0, 10000).ok).toBe(true);
    expect(validateOwnershipTotalBp(5000, 5000).ok).toBe(true);
  });

  it("rejects out-of-range percentages", () => {
    expect(validateOwnershipTotalBp(0, 0).ok).toBe(false);
    expect(validateOwnershipTotalBp(0, 10001).ok).toBe(false);
    expect(validateOwnershipTotalBp(0, -100).ok).toBe(false);
    expect(validateOwnershipTotalBp(0, 5000.5).ok).toBe(false);
  });
});
