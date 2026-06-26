// Transaction category taxonomy.
//
// Layered over `lib/sa105.ts`. The SA105 categories map to UK tax boxes and flow
// into the tax estimate. Two extra categories — tenancy DEPOSITS (a liability, not
// taxable income) and CAPITAL_EXPENDITURE (not a revenue expense; tracked
// separately for CGT) — are deliberately kept OUTSIDE `Sa105Category` so
// `isSa105Category()` stays false for them and `getTaxYearTxns`/`computeTaxEstimate`
// never count them. Do NOT add them to SA105_MAP.

import { TxnDirection } from "./enums";
import {
  Sa105Category,
  Sa105CategoryLabel,
  Sa105CategoryDirection,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from "./sa105";

export const ExtraCategory = {
  DEPOSIT: "DEPOSIT",
  CAPITAL_EXPENDITURE: "CAPITAL_EXPENDITURE",
  // A director lending money to / drawing money from their company. Like the
  // others, kept OUT of `Sa105Category` so it never enters the tax estimate — a
  // directors' loan is a balance-sheet movement, not taxable income/expense.
  DIRECTORS_LOAN: "DIRECTORS_LOAN",
} as const;
export type ExtraCategory = (typeof ExtraCategory)[keyof typeof ExtraCategory];

/** Every category a transaction can carry (SA105 + the non-taxable extras). */
export type AllCategory = Sa105Category | ExtraCategory;

export const ExtraCategoryLabel: Record<ExtraCategory, string> = {
  DEPOSIT: "Tenancy deposit",
  CAPITAL_EXPENDITURE: "Capital expenditure",
  DIRECTORS_LOAN: "Directors' loan",
};

export const allCategoryLabel: Record<AllCategory, string> = {
  ...Sa105CategoryLabel,
  ...ExtraCategoryLabel,
};

export const ExtraCategoryDirection: Record<ExtraCategory, TxnDirection> = {
  DEPOSIT: TxnDirection.INCOME,
  CAPITAL_EXPENDITURE: TxnDirection.EXPENSE,
  // Default for the picker; a real movement carries its own direction (a director
  // introducing capital is INCOME, a repayment/drawing is EXPENSE).
  DIRECTORS_LOAN: TxnDirection.EXPENSE,
};

export const allCategoryDirection: Record<AllCategory, TxnDirection> = {
  ...Sa105CategoryDirection,
  ...ExtraCategoryDirection,
};

export const ALL_INCOME_CATEGORIES: AllCategory[] = [
  ...INCOME_CATEGORIES,
  ExtraCategory.DEPOSIT,
];
export const ALL_EXPENSE_CATEGORIES: AllCategory[] = [
  ...EXPENSE_CATEGORIES,
  ExtraCategory.CAPITAL_EXPENDITURE,
  ExtraCategory.DIRECTORS_LOAN,
];

export function isKnownCategory(v: string | null | undefined): v is AllCategory {
  return !!v && v in allCategoryLabel;
}

export function isExtraCategory(
  v: string | null | undefined,
): v is ExtraCategory {
  return !!v && v in ExtraCategoryLabel;
}

/** How a category is treated for tax. NON_TAXABLE + CAPITAL are excluded. */
export type CategoryTreatment =
  | "INCOME"
  | "ALLOWABLE"
  | "FINANCE_COST"
  | "NON_TAXABLE"
  | "CAPITAL";

export function categoryTreatment(c: AllCategory): CategoryTreatment {
  if (c === ExtraCategory.DEPOSIT) return "NON_TAXABLE";
  if (c === ExtraCategory.DIRECTORS_LOAN) return "NON_TAXABLE";
  if (c === ExtraCategory.CAPITAL_EXPENDITURE) return "CAPITAL";
  if (c === Sa105Category.MORTGAGE_INTEREST) return "FINANCE_COST";
  if (allCategoryDirection[c] === TxnDirection.INCOME) return "INCOME";
  return "ALLOWABLE";
}

/** Display label for any stored category string (falls back to Uncategorised). */
export function categoryLabel(c: string | null | undefined): string {
  return isKnownCategory(c) ? allCategoryLabel[c] : "Uncategorised";
}

/** Optional secondary classification per category; UI shows it only when present. */
export const SUBCATEGORIES: Partial<Record<AllCategory, string[]>> = {
  RENT_INCOME: ["Monthly rent", "Top-up / arrears", "Other"],
  REPAIRS_MAINTENANCE: [
    "Plumbing",
    "Electrical",
    "Decorating",
    "Appliance",
    "Grounds",
    "Other",
  ],
  UTILITIES: ["Gas", "Electricity", "Water", "Broadband", "Other"],
  SERVICE_CHARGE: ["Service charge", "Ground rent", "Sinking fund"],
  INSURANCE: ["Buildings", "Contents", "Landlord liability", "Other"],
  CAPITAL_EXPENDITURE: [
    "Furniture",
    "Improvement",
    "Extension",
    "New appliance",
    "Other",
  ],
};

export function subcategoriesFor(c: string | null | undefined): string[] {
  return isKnownCategory(c) ? (SUBCATEGORIES[c] ?? []) : [];
}
