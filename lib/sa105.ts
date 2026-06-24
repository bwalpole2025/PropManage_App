// SA105 (UK Self Assessment "UK property" pages) mapping.
//
// `Sa105Category` is the user-facing transaction category shown in the UI.
// `Sa105Box` is the actual SA105 box the category rolls up into. The box
// numbers below are indicative of the 2024-25 / 2025-26 SA105 layout — HMRC
// occasionally renumbers, so a production build should version this per year.

import { TxnDirection } from "./enums";

export const Sa105Box = {
  // Income
  RENTS_RECEIVED: "box20", // Total rents and other income from property
  PROPERTY_INCOME_ALLOW: "box20.1", // £1,000 property income allowance
  OTHER_PROPERTY_INCOME: "box21",
  PREMIUMS_LEASES: "box22",
  // Expenses
  RENT_RATES_INSURANCE: "box24", // Rent, rates, insurance, ground rents
  PROPERTY_REPAIRS: "box25", // Repairs and maintenance
  FINANCE_COSTS: "box26", // Loan interest & other finance costs (restricted)
  LEGAL_PROFESSIONAL: "box27", // Legal, management and professional fees
  COSTS_SERVICES: "box28", // Cost of services provided, incl. wages
  OTHER_EXPENSES: "box29",
  // Adjustments / allowances
  PRIVATE_USE_ADJ: "box30",
  RESIDENTIAL_FIN_COST: "box44", // Residential finance cost for the 20% reduction
} as const;
export type Sa105Box = (typeof Sa105Box)[keyof typeof Sa105Box];

export const Sa105BoxLabel: Record<Sa105Box, string> = {
  box20: "Total rents received",
  "box20.1": "Property income allowance",
  box21: "Other property income",
  box22: "Premiums for leases",
  box24: "Rent, rates, insurance, ground rents",
  box25: "Property repairs and maintenance",
  box26: "Loan interest & finance costs",
  box27: "Legal, management & professional fees",
  box28: "Cost of services (incl. wages)",
  box29: "Other allowable property expenses",
  box30: "Private use adjustment",
  box44: "Residential finance cost (20% reduction)",
};

export const Sa105Category = {
  // Income
  RENT_INCOME: "RENT_INCOME",
  OTHER_INCOME: "OTHER_INCOME",
  LEASE_PREMIUM: "LEASE_PREMIUM",
  // Expenses
  GROUND_RENT: "GROUND_RENT",
  COUNCIL_TAX: "COUNCIL_TAX",
  INSURANCE: "INSURANCE",
  UTILITIES: "UTILITIES",
  REPAIRS_MAINTENANCE: "REPAIRS_MAINTENANCE",
  MORTGAGE_INTEREST: "MORTGAGE_INTEREST",
  LETTING_AGENT_FEES: "LETTING_AGENT_FEES",
  ACCOUNTANCY_LEGAL: "ACCOUNTANCY_LEGAL",
  MANAGEMENT_FEES: "MANAGEMENT_FEES",
  CLEANING_GARDENING: "CLEANING_GARDENING",
  SERVICE_CHARGE: "SERVICE_CHARGE",
  ADVERTISING: "ADVERTISING",
  OTHER_EXPENSE: "OTHER_EXPENSE",
} as const;
export type Sa105Category =
  (typeof Sa105Category)[keyof typeof Sa105Category];

export const Sa105CategoryLabel: Record<Sa105Category, string> = {
  RENT_INCOME: "Rent received",
  OTHER_INCOME: "Other property income",
  LEASE_PREMIUM: "Lease premium",
  GROUND_RENT: "Ground rent",
  COUNCIL_TAX: "Council tax",
  INSURANCE: "Insurance",
  UTILITIES: "Utilities",
  REPAIRS_MAINTENANCE: "Repairs & maintenance",
  MORTGAGE_INTEREST: "Mortgage interest",
  LETTING_AGENT_FEES: "Letting agent fees",
  ACCOUNTANCY_LEGAL: "Accountancy & legal",
  MANAGEMENT_FEES: "Management fees",
  CLEANING_GARDENING: "Cleaning & gardening",
  SERVICE_CHARGE: "Service charge",
  ADVERTISING: "Advertising",
  OTHER_EXPENSE: "Other expense",
};

/** Which direction each category belongs to. */
export const Sa105CategoryDirection: Record<Sa105Category, TxnDirection> = {
  RENT_INCOME: TxnDirection.INCOME,
  OTHER_INCOME: TxnDirection.INCOME,
  LEASE_PREMIUM: TxnDirection.INCOME,
  GROUND_RENT: TxnDirection.EXPENSE,
  COUNCIL_TAX: TxnDirection.EXPENSE,
  INSURANCE: TxnDirection.EXPENSE,
  UTILITIES: TxnDirection.EXPENSE,
  REPAIRS_MAINTENANCE: TxnDirection.EXPENSE,
  MORTGAGE_INTEREST: TxnDirection.EXPENSE,
  LETTING_AGENT_FEES: TxnDirection.EXPENSE,
  ACCOUNTANCY_LEGAL: TxnDirection.EXPENSE,
  MANAGEMENT_FEES: TxnDirection.EXPENSE,
  CLEANING_GARDENING: TxnDirection.EXPENSE,
  SERVICE_CHARGE: TxnDirection.EXPENSE,
  ADVERTISING: TxnDirection.EXPENSE,
  OTHER_EXPENSE: TxnDirection.EXPENSE,
};

/** Category -> SA105 box. */
export const SA105_MAP: Record<Sa105Category, Sa105Box> = {
  RENT_INCOME: Sa105Box.RENTS_RECEIVED,
  OTHER_INCOME: Sa105Box.OTHER_PROPERTY_INCOME,
  LEASE_PREMIUM: Sa105Box.PREMIUMS_LEASES,
  GROUND_RENT: Sa105Box.RENT_RATES_INSURANCE,
  COUNCIL_TAX: Sa105Box.RENT_RATES_INSURANCE,
  INSURANCE: Sa105Box.RENT_RATES_INSURANCE,
  UTILITIES: Sa105Box.COSTS_SERVICES,
  REPAIRS_MAINTENANCE: Sa105Box.PROPERTY_REPAIRS,
  MORTGAGE_INTEREST: Sa105Box.FINANCE_COSTS,
  LETTING_AGENT_FEES: Sa105Box.LEGAL_PROFESSIONAL,
  ACCOUNTANCY_LEGAL: Sa105Box.LEGAL_PROFESSIONAL,
  MANAGEMENT_FEES: Sa105Box.LEGAL_PROFESSIONAL,
  CLEANING_GARDENING: Sa105Box.COSTS_SERVICES,
  SERVICE_CHARGE: Sa105Box.COSTS_SERVICES,
  ADVERTISING: Sa105Box.OTHER_EXPENSES,
  OTHER_EXPENSE: Sa105Box.OTHER_EXPENSES,
};

export const INCOME_CATEGORIES = (
  Object.keys(Sa105CategoryDirection) as Sa105Category[]
).filter((c) => Sa105CategoryDirection[c] === TxnDirection.INCOME);

export const EXPENSE_CATEGORIES = (
  Object.keys(Sa105CategoryDirection) as Sa105Category[]
).filter((c) => Sa105CategoryDirection[c] === TxnDirection.EXPENSE);

export function isSa105Category(value: string | null | undefined): value is Sa105Category {
  return !!value && value in Sa105CategoryLabel;
}
