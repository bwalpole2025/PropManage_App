// Central enum-like constants. SQLite has no native enums, so DB columns are
// strings constrained here. Each export pairs the allowed values with a
// human-readable label map for the UI.

// Spec User.role — a global default/classification, distinct from the per-account
// Membership.role (which remains the RBAC authority). Lowercase per the spec.
export const UserRole = {
  OWNER: "owner",
  ASSISTANT: "assistant",
  ACCOUNTANT: "accountant",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export const UserRoleLabel: Record<UserRole, string> = {
  owner: "Owner",
  assistant: "Assistant",
  accountant: "Accountant",
};

// Portfolio type (lowercase per spec).
export const PortfolioType = {
  PERSONAL: "personal",
  BUSINESS: "business",
} as const;
export type PortfolioType = (typeof PortfolioType)[keyof typeof PortfolioType];
export const PortfolioTypeLabel: Record<PortfolioType, string> = {
  personal: "Personal",
  business: "Business",
};

// Beneficial owner type (lowercase per spec).
export const BeneficialOwnerType = {
  INDIVIDUAL: "individual",
  COMPANY: "company",
} as const;
export type BeneficialOwnerType =
  (typeof BeneficialOwnerType)[keyof typeof BeneficialOwnerType];
export const BeneficialOwnerTypeLabel: Record<BeneficialOwnerType, string> = {
  individual: "Individual",
  company: "Company",
};

// Account subscription state.
export const SubscriptionStatus = {
  TRIALING: "trialing",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
} as const;
export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

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
// Spec status active/vacant maps onto ACTIVE / VOID.
export const TenancyStatusLabel: Record<TenancyStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ENDED: "Ended",
  VOID: "Vacant",
};

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

export const NotificationKind = {
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  RENT_OVERDUE: "RENT_OVERDUE",
  RENT_UPCOMING: "RENT_UPCOMING",
  COMPLIANCE_EXPIRY: "COMPLIANCE_EXPIRY",
  MTD_DEADLINE: "MTD_DEADLINE",
  BANK_CONSENT_EXPIRY: "BANK_CONSENT_EXPIRY",
  REMINDER: "REMINDER",
} as const;
export type NotificationKind =
  (typeof NotificationKind)[keyof typeof NotificationKind];

export const NotificationKindLabel: Record<NotificationKind, string> = {
  PAYMENT_RECEIVED: "Payment received",
  RENT_OVERDUE: "Rent overdue",
  RENT_UPCOMING: "Rent due soon",
  COMPLIANCE_EXPIRY: "Document expiring",
  MTD_DEADLINE: "MTD deadline approaching",
  BANK_CONSENT_EXPIRY: "Bank connection expiring",
  REMINDER: "Reminder",
};

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

// General document categories (compliance certs + insurance + tenancy +
// financial + import + misc). DB column is a free String; values not listed here
// are custom categories (DocumentCustomCategory id) — resolved via
// `resolveDocumentCategoryLabel`. Existing keys are preserved so seeded data
// keeps resolving; labels follow the Documents-area spec.
export const DocumentCategory = {
  // Compliance certificates
  EICR: "EICR", // Electrical Safety Certificate
  EPC: "EPC",
  FIRE_ALARM: "FIRE_ALARM",
  FIRE_SAFETY: "FIRE_SAFETY",
  GAS_SAFETY: "GAS_SAFETY",
  LICENCE_HMO: "LICENCE_HMO", // HMO License
  LEGIONELLA: "LEGIONELLA",
  PAT: "PAT",
  // Insurance (sub-types + general)
  INSURANCE_BUILDINGS: "INSURANCE_BUILDINGS",
  INSURANCE_CONTENTS: "INSURANCE_CONTENTS",
  INSURANCE_RENT_GUARANTEE: "INSURANCE_RENT_GUARANTEE",
  INSURANCE_LANDLORD: "INSURANCE_LANDLORD",
  INSURANCE_APPLIANCE: "INSURANCE_APPLIANCE",
  INSURANCE_DEPOSIT: "INSURANCE_DEPOSIT",
  INSURANCE_MORTGAGE_PROTECTION: "INSURANCE_MORTGAGE_PROTECTION",
  INSURANCE: "INSURANCE",
  // Tenancy
  TENANCY_AGREEMENT: "TENANCY_AGREEMENT",
  TENANT_REFERENCE: "TENANT_REFERENCE",
  INVENTORY: "INVENTORY",
  // Financial
  MORTGAGE: "MORTGAGE",
  LETTING_AGENT_STATEMENT: "LETTING_AGENT_STATEMENT",
  STATEMENT: "STATEMENT",
  RECEIPT: "RECEIPT",
  // Imports
  IMPORT_CLIENT: "IMPORT_CLIENT",
  IMPORT_PROPERTY: "IMPORT_PROPERTY",
  IMPORT_TENANT: "IMPORT_TENANT",
  IMPORT_TRANSACTIONS: "IMPORT_TRANSACTIONS",
  // Misc
  LOGO: "LOGO",
  OTHER: "OTHER",
} as const;
export type DocumentCategory =
  (typeof DocumentCategory)[keyof typeof DocumentCategory];
export const DocumentCategoryLabel: Record<DocumentCategory, string> = {
  EICR: "Electrical Safety Certificate",
  EPC: "EPC",
  FIRE_ALARM: "Fire Alarm Certificate",
  FIRE_SAFETY: "Fire Safety Certificate",
  GAS_SAFETY: "Gas Safety Certificate",
  LICENCE_HMO: "HMO License",
  LEGIONELLA: "Legionella Risk Assessment",
  PAT: "PAT Test",
  INSURANCE_BUILDINGS: "Insurance — Buildings",
  INSURANCE_CONTENTS: "Insurance — Contents",
  INSURANCE_RENT_GUARANTEE: "Insurance — Rent Guarantee",
  INSURANCE_LANDLORD: "Insurance — Landlord",
  INSURANCE_APPLIANCE: "Insurance — Appliance",
  INSURANCE_DEPOSIT: "Insurance — Deposit",
  INSURANCE_MORTGAGE_PROTECTION: "Insurance — Mortgage Protection",
  INSURANCE: "Insurance (general)",
  TENANCY_AGREEMENT: "Tenancy Agreement",
  TENANT_REFERENCE: "Tenant Reference",
  INVENTORY: "Inventory",
  MORTGAGE: "Mortgage",
  LETTING_AGENT_STATEMENT: "Letting Agent Statement",
  STATEMENT: "Statement",
  RECEIPT: "Receipt",
  IMPORT_CLIENT: "Client Import",
  IMPORT_PROPERTY: "Property Import",
  IMPORT_TENANT: "Tenant Import",
  IMPORT_TRANSACTIONS: "Transactions Import",
  LOGO: "Logo",
  OTHER: "Other",
};

/** Grouped categories for `<optgroup>` pickers, in display order. */
export const DOCUMENT_CATEGORY_GROUPS: {
  label: string;
  categories: DocumentCategory[];
}[] = [
  {
    label: "Compliance certificates",
    categories: [
      DocumentCategory.EICR,
      DocumentCategory.EPC,
      DocumentCategory.FIRE_ALARM,
      DocumentCategory.FIRE_SAFETY,
      DocumentCategory.GAS_SAFETY,
      DocumentCategory.LICENCE_HMO,
      DocumentCategory.LEGIONELLA,
      DocumentCategory.PAT,
    ],
  },
  {
    label: "Insurance",
    categories: [
      DocumentCategory.INSURANCE_BUILDINGS,
      DocumentCategory.INSURANCE_CONTENTS,
      DocumentCategory.INSURANCE_RENT_GUARANTEE,
      DocumentCategory.INSURANCE_LANDLORD,
      DocumentCategory.INSURANCE_APPLIANCE,
      DocumentCategory.INSURANCE_DEPOSIT,
      DocumentCategory.INSURANCE_MORTGAGE_PROTECTION,
      DocumentCategory.INSURANCE,
    ],
  },
  {
    label: "Tenancy",
    categories: [
      DocumentCategory.TENANCY_AGREEMENT,
      DocumentCategory.TENANT_REFERENCE,
      DocumentCategory.INVENTORY,
    ],
  },
  {
    label: "Financial",
    categories: [
      DocumentCategory.MORTGAGE,
      DocumentCategory.LETTING_AGENT_STATEMENT,
      DocumentCategory.STATEMENT,
      DocumentCategory.RECEIPT,
    ],
  },
  {
    label: "Imports",
    categories: [
      DocumentCategory.IMPORT_CLIENT,
      DocumentCategory.IMPORT_PROPERTY,
      DocumentCategory.IMPORT_TENANT,
      DocumentCategory.IMPORT_TRANSACTIONS,
    ],
  },
  {
    label: "Other",
    categories: [DocumentCategory.LOGO, DocumentCategory.OTHER],
  },
];

const BUILTIN_DOCUMENT_CATEGORIES = new Set<string>(
  Object.values(DocumentCategory),
);
export function isBuiltinDocumentCategory(value: string): boolean {
  return BUILTIN_DOCUMENT_CATEGORIES.has(value);
}

/**
 * Human label for a stored `Document.category`. Built-ins use the label map;
 * anything else is treated as a custom category id, resolved via `customNames`
 * (id → name), falling back to the raw value.
 */
export function resolveDocumentCategoryLabel(
  category: string,
  customNames?: Record<string, string>,
): string {
  if (isBuiltinDocumentCategory(category)) {
    return DocumentCategoryLabel[category as DocumentCategory];
  }
  return customNames?.[category] ?? "Custom category";
}

// Compliance certificates expire and drive reminders (subset of DocumentCategory).
export const COMPLIANCE_CATEGORIES: DocumentCategory[] = [
  DocumentCategory.EICR,
  DocumentCategory.EPC,
  DocumentCategory.FIRE_ALARM,
  DocumentCategory.FIRE_SAFETY,
  DocumentCategory.GAS_SAFETY,
  DocumentCategory.LICENCE_HMO,
  DocumentCategory.LEGIONELLA,
  DocumentCategory.PAT,
  DocumentCategory.INSURANCE_BUILDINGS,
  DocumentCategory.INSURANCE_CONTENTS,
  DocumentCategory.INSURANCE_RENT_GUARANTEE,
  DocumentCategory.INSURANCE_LANDLORD,
  DocumentCategory.INSURANCE_APPLIANCE,
  DocumentCategory.INSURANCE_DEPOSIT,
  DocumentCategory.INSURANCE_MORTGAGE_PROTECTION,
  DocumentCategory.INSURANCE,
];

/** Default reminder lead times (days before expiry) for an expiring document. */
export const DEFAULT_REMINDER_OFFSETS_DAYS = [30, 14, 7, 1] as const;

// Expiry-window filter options for the Documents area.
export const ExpiryWindow = {
  ANY: "any",
  D14: "14",
  D30: "30",
  D90: "90",
  D180: "180",
} as const;
export type ExpiryWindow = (typeof ExpiryWindow)[keyof typeof ExpiryWindow];
export const ExpiryWindowLabel: Record<ExpiryWindow, string> = {
  any: "Any expiry",
  "14": "Within 2 weeks",
  "30": "Within 1 month",
  "90": "Within 3 months",
  "180": "Within 6 months",
};
/** Days for each bounded window (ANY has no bound). */
export const ExpiryWindowDays: Record<Exclude<ExpiryWindow, "any">, number> = {
  "14": 14,
  "30": 30,
  "90": 90,
  "180": 180,
};

// Internal materialised-reminder lifecycle (DocumentReminder scheduler).
export const ReminderStatus = {
  PENDING: "PENDING",
  SENT: "SENT",
  DISMISSED: "DISMISSED",
} as const;
export type ReminderStatus =
  (typeof ReminderStatus)[keyof typeof ReminderStatus];

// User-facing reminder lifecycle (distinct from ReminderStatus above).
export const ReminderState = {
  OPEN: "OPEN",
  COMPLETED: "COMPLETED",
} as const;
export type ReminderState = (typeof ReminderState)[keyof typeof ReminderState];
export const ReminderStateLabel: Record<ReminderState, string> = {
  OPEN: "Open",
  COMPLETED: "Completed",
};

export const InsuranceType = {
  BUILDINGS: "BUILDINGS",
  CONTENTS: "CONTENTS",
  LANDLORD_LIABILITY: "LANDLORD_LIABILITY",
  COMBINED: "COMBINED",
  RENT_GUARANTEE: "RENT_GUARANTEE",
  OTHER: "OTHER",
} as const;
export type InsuranceType = (typeof InsuranceType)[keyof typeof InsuranceType];
export const InsuranceTypeLabel: Record<InsuranceType, string> = {
  BUILDINGS: "Buildings",
  CONTENTS: "Contents",
  LANDLORD_LIABILITY: "Landlord liability",
  COMBINED: "Combined landlord",
  RENT_GUARANTEE: "Rent guarantee",
  OTHER: "Other",
};

export const MortgageProduct = {
  FIXED: "FIXED",
  TRACKER: "TRACKER",
  VARIABLE: "VARIABLE",
  DISCOUNT: "DISCOUNT",
  INTEREST_ONLY: "INTEREST_ONLY",
} as const;
export type MortgageProduct =
  (typeof MortgageProduct)[keyof typeof MortgageProduct];
export const MortgageProductLabel: Record<MortgageProduct, string> = {
  FIXED: "Fixed rate",
  TRACKER: "Tracker",
  VARIABLE: "Standard variable",
  DISCOUNT: "Discount",
  INTEREST_ONLY: "Interest only",
};

export const TenancyArrearsState = {
  CURRENT: "CURRENT",
  ARREARS: "ARREARS",
  CREDIT: "CREDIT",
} as const;
export type TenancyArrearsState =
  (typeof TenancyArrearsState)[keyof typeof TenancyArrearsState];

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
