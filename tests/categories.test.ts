import { describe, it, expect } from "vitest";
import {
  ALL_INCOME_CATEGORIES,
  ALL_EXPENSE_CATEGORIES,
  allCategoryDirection,
  categoryTreatment,
  ExtraCategory,
  isKnownCategory,
  subcategoriesFor,
} from "@/lib/categories";
import { isSa105Category, Sa105Category } from "@/lib/sa105";
import { TxnDirection } from "@/lib/enums";

describe("category taxonomy", () => {
  it("adds DEPOSIT (income) and CAPITAL_EXPENDITURE (expense) to the pickers", () => {
    expect(ALL_INCOME_CATEGORIES).toContain(ExtraCategory.DEPOSIT);
    expect(ALL_EXPENSE_CATEGORIES).toContain(ExtraCategory.CAPITAL_EXPENDITURE);
    expect(allCategoryDirection[ExtraCategory.DEPOSIT]).toBe(TxnDirection.INCOME);
    expect(allCategoryDirection[ExtraCategory.CAPITAL_EXPENDITURE]).toBe(
      TxnDirection.EXPENSE,
    );
  });

  it("keeps deposits + capital OUT of the SA105 set (excluded from tax)", () => {
    // The tax read path filters on isSa105Category, so these must be false.
    expect(isSa105Category(ExtraCategory.DEPOSIT)).toBe(false);
    expect(isSa105Category(ExtraCategory.CAPITAL_EXPENDITURE)).toBe(false);
    // …but they are still "known" categories the ledger accepts.
    expect(isKnownCategory(ExtraCategory.DEPOSIT)).toBe(true);
    expect(isKnownCategory(ExtraCategory.CAPITAL_EXPENDITURE)).toBe(true);
    expect(isKnownCategory("NONSENSE")).toBe(false);
  });

  it("classifies tax treatment correctly", () => {
    expect(categoryTreatment(Sa105Category.RENT_INCOME)).toBe("INCOME");
    expect(categoryTreatment(Sa105Category.REPAIRS_MAINTENANCE)).toBe("ALLOWABLE");
    expect(categoryTreatment(Sa105Category.MORTGAGE_INTEREST)).toBe("FINANCE_COST");
    expect(categoryTreatment(ExtraCategory.DEPOSIT)).toBe("NON_TAXABLE");
    expect(categoryTreatment(ExtraCategory.CAPITAL_EXPENDITURE)).toBe("CAPITAL");
  });

  it("exposes subcategories only where defined", () => {
    expect(subcategoriesFor(Sa105Category.UTILITIES)).toContain("Gas");
    expect(subcategoriesFor(Sa105Category.OTHER_EXPENSE)).toEqual([]);
    expect(subcategoriesFor(null)).toEqual([]);
  });
});
