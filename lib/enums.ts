// Central enum-like constants. SQLite has no native enums, so DB columns are
// strings constrained here. Each export pairs the allowed values with a
// human-readable label map for the UI.

export const UserKind = {
  LANDLORD: "LANDLORD",
  ACCOUNTANT: "ACCOUNTANT",
  ASSISTANT: "ASSISTANT",
  ADMIN: "ADMIN",
} as const;
export type UserKind = (typeof UserKind)[keyof typeof UserKind];

export const LandlordType = {
  INDIVIDUAL: "INDIVIDUAL",
  PORTFOLIO: "PORTFOLIO",
  LIMITED_COMPANY: "LIMITED_COMPANY",
} as const;
export type LandlordType = (typeof LandlordType)[keyof typeof LandlordType];
export const LandlordTypeLabel: Record<LandlordType, string> = {
  INDIVIDUAL: "Individual landlord",
  PORTFOLIO: "Portfolio landlord",
  LIMITED_COMPANY: "Limited company",
};

export const MembershipRole = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  ACCOUNTANT: "ACCOUNTANT",
  ASSISTANT: "ASSISTANT",
  VIEWER: "VIEWER",
} as const;
export type MembershipRole = (typeof MembershipRole)[keyof typeof MembershipRole];
export const MembershipRoleLabel: Record<MembershipRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  ACCOUNTANT: "Accountant",
  ASSISTANT: "Assistant",
  VIEWER: "Viewer",
};

export const MembershipStatus = {
  INVITED: "INVITED",
  ACTIVE: "ACTIVE",
  REVOKED: "REVOKED",
} as const;
export type MembershipStatus =
  (typeof MembershipStatus)[keyof typeof MembershipStatus];

export const PropertyType = {
  FLAT: "FLAT",
  TERRACED: "TERRACED",
  SEMI_DETACHED: "SEMI_DETACHED",
  DETACHED: "DETACHED",
  BUNGALOW: "BUNGALOW",
  HMO: "HMO",
  COMMERCIAL: "COMMERCIAL",
  OTHER: "OTHER",
} as const;
export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType];
export const PropertyTypeLabel: Record<PropertyType, string> = {
  FLAT: "Flat / Apartment",
  TERRACED: "Terraced house",
  SEMI_DETACHED: "Semi-detached house",
  DETACHED: "Detached house",
  BUNGALOW: "Bungalow",
  HMO: "HMO",
  COMMERCIAL: "Commercial",
  OTHER: "Other",
};

export const TenancyStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  ENDED: "ENDED",
  VOID: "VOID",
} as const;
export type TenancyStatus = (typeof TenancyStatus)[keyof typeof TenancyStatus];

export const RentFrequency = {
  WEEKLY: "WEEKLY",
  FORTNIGHTLY: "FORTNIGHTLY",
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  ANNUALLY: "ANNUALLY",
} as const;
export type RentFrequency = (typeof RentFrequency)[keyof typeof RentFrequency];
export const RentFrequencyLabel: Record<RentFrequency, string> = {
  WEEKLY: "Weekly",
  FORTNIGHTLY: "Fortnightly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUALLY: "Annually",
};
/** Number of rent periods in a calendar year for each frequency. */
export const RentPeriodsPerYear: Record<RentFrequency, number> = {
  WEEKLY: 52,
  FORTNIGHTLY: 26,
  MONTHLY: 12,
  QUARTERLY: 4,
  ANNUALLY: 1,
};

export const DepositScheme = {
  DPS: "DPS",
  MYDEPOSITS: "MYDEPOSITS",
  TDS: "TDS",
  NONE: "NONE",
} as const;
export type DepositScheme = (typeof DepositScheme)[keyof typeof DepositScheme];

export const TxnDirection = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;
export type TxnDirection = (typeof TxnDirection)[keyof typeof TxnDirection];

export const TxnSource = {
  BANK_FEED: "BANK_FEED",
  MANUAL: "MANUAL",
  IMPORTED: "IMPORTED",
} as const;
export type TxnSource = (typeof TxnSource)[keyof typeof TxnSource];

export const TxnStatus = {
  UNRECONCILED: "UNRECONCILED",
  RECONCILED: "RECONCILED",
  EXCLUDED: "EXCLUDED",
} as const;
export type TxnStatus = (typeof TxnStatus)[keyof typeof TxnStatus];

export const RentStatus = {
  DUE: "DUE",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  WAIVED: "WAIVED",
} as const;
export type RentStatus = (typeof RentStatus)[keyof typeof RentStatus];

export const BankConnStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
  ERROR: "ERROR",
} as const;
export type BankConnStatus =
  (typeof BankConnStatus)[keyof typeof BankConnStatus];

export const ComplianceType = {
  EPC: "EPC",
  GAS_SAFETY: "GAS_SAFETY",
  EICR: "EICR",
  PAT: "PAT",
  LEGIONELLA: "LEGIONELLA",
  FIRE_ALARM: "FIRE_ALARM",
  INSURANCE: "INSURANCE",
  LICENCE_HMO: "LICENCE_HMO",
  OTHER: "OTHER",
} as const;
export type ComplianceType =
  (typeof ComplianceType)[keyof typeof ComplianceType];
export const ComplianceTypeLabel: Record<ComplianceType, string> = {
  EPC: "EPC (Energy Performance)",
  GAS_SAFETY: "Gas Safety (CP12)",
  EICR: "EICR (Electrical)",
  PAT: "PAT Testing",
  LEGIONELLA: "Legionella Risk Assessment",
  FIRE_ALARM: "Fire / Smoke Alarm",
  INSURANCE: "Landlord Insurance",
  LICENCE_HMO: "HMO Licence",
  OTHER: "Other Certificate",
};

export const ReminderStatus = {
  PENDING: "PENDING",
  SENT: "SENT",
  DISMISSED: "DISMISSED",
} as const;
export type ReminderStatus =
  (typeof ReminderStatus)[keyof typeof ReminderStatus];

export const ImportantDateKind = {
  TENANCY_RENEWAL: "TENANCY_RENEWAL",
  RENT_REVIEW: "RENT_REVIEW",
  MORTGAGE_FIX_END: "MORTGAGE_FIX_END",
  INSPECTION: "INSPECTION",
  CUSTOM: "CUSTOM",
} as const;
export type ImportantDateKind =
  (typeof ImportantDateKind)[keyof typeof ImportantDateKind];
export const ImportantDateKindLabel: Record<ImportantDateKind, string> = {
  TENANCY_RENEWAL: "Tenancy renewal",
  RENT_REVIEW: "Rent review",
  MORTGAGE_FIX_END: "Mortgage fix ends",
  INSPECTION: "Inspection",
  CUSTOM: "Custom",
};

export const MtdStatus = {
  NOT_CONNECTED: "NOT_CONNECTED",
  CONNECTED: "CONNECTED",
  EXPIRED: "EXPIRED",
  ERROR: "ERROR",
} as const;
export type MtdStatus = (typeof MtdStatus)[keyof typeof MtdStatus];

export const ObligationType = {
  QUARTERLY_UPDATE: "QUARTERLY_UPDATE",
  FINAL_DECLARATION: "FINAL_DECLARATION",
} as const;
export type ObligationType =
  (typeof ObligationType)[keyof typeof ObligationType];

export const ObligationStatus = {
  OPEN: "OPEN",
  FULFILLED: "FULFILLED",
} as const;
export type ObligationStatus =
  (typeof ObligationStatus)[keyof typeof ObligationStatus];

export const SubmissionType = {
  QUARTERLY_UPDATE: "QUARTERLY_UPDATE",
  ANNUAL_SUMMARY: "ANNUAL_SUMMARY",
  FINAL_DECLARATION: "FINAL_DECLARATION",
} as const;
export type SubmissionType =
  (typeof SubmissionType)[keyof typeof SubmissionType];

export const SubmissionStatus = {
  PENDING: "PENDING",
  SUBMITTED: "SUBMITTED",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
} as const;
export type SubmissionStatus =
  (typeof SubmissionStatus)[keyof typeof SubmissionStatus];
