import {
  Building2,
  Users2,
  KeyRound,
  ArrowLeftRight,
  Landmark,
  Calculator,
  FolderClock,
  FileSpreadsheet,
  FileCheck2,
} from "lucide-react";
import type { CoachmarkStep } from "./section-coachmark";

// First-run coachmark copy, one entry (or step list) per section.
// NOTE: the step `icon` values are React components (functions) and therefore
// must NOT cross the Server→Client boundary. This module is imported only by the
// client <SectionCoachmark>, which looks steps up from COACHMARKS by section key;
// server pages pass just the section string.

const PROPERTIES_COACHMARK: CoachmarkStep[] = [
  {
    icon: Building2,
    heading: "Add your first property",
    bullets: [
      "Add each rental with its address, type and monthly rent.",
      "Everything — rent, expenses, compliance — hangs off the property.",
      "Track arrears and certificate expiry at a glance.",
      "Edit or archive a property any time.",
    ],
  },
];

const OWNERSHIP_COACHMARK: CoachmarkStep[] = [
  {
    icon: Users2,
    heading: "Who owns what",
    bullets: [
      "Split ownership between personal and business (company) entities.",
      "Set each owner's percentage share for accurate tax splits.",
      "Beneficial-owner shares flow straight into your SA105 figures.",
      "Joint owners each see their own slice of income and expense.",
    ],
  },
];

const TENANCIES_COACHMARK: CoachmarkStep[] = [
  {
    icon: KeyRound,
    heading: "Track rent and arrears",
    bullets: [
      "Record the tenant, rent amount and payment frequency.",
      "We build a rent schedule and flag missed or partial payments.",
      "Overdue rent surfaces on your dashboard automatically.",
      "Void periods are tracked so your figures stay accurate.",
    ],
  },
];

const TRANSACTIONS_COACHMARK: CoachmarkStep[] = [
  {
    icon: ArrowLeftRight,
    heading: "Categorise every transaction",
    bullets: [
      "Tag each transaction to an SA105 box — rent, repairs, mortgage interest.",
      "Income vs expense is set per entry, with full edit history.",
      "Categories drive what's allowable and what isn't.",
    ],
  },
  {
    icon: Landmark,
    heading: "Reconcile your bank feed",
    bullets: [
      "Match imported bank activity to rent received and expenses paid.",
      "Reconciled transactions are locked to the right tax year.",
      "Spot duplicates and gaps before they reach your return.",
    ],
  },
  {
    icon: Calculator,
    heading: "Powers your tax estimate",
    bullets: [
      "Categorised, reconciled transactions feed your live SA105 estimate.",
      "See taxable profit and estimated tax update as you go.",
      "No spreadsheet reconciling at year-end — it's already done.",
    ],
  },
];

const TAX_COACHMARK: CoachmarkStep[] = [
  {
    icon: Calculator,
    heading: "Your Tax Statement",
    bullets: [
      "A live SA105 estimate from your categorised transactions.",
      "Allowable expenses are applied automatically by category.",
      "Ownership splits divide profit across owners correctly.",
      "Figures are an estimate — confirm with your accountant.",
    ],
  },
];

const DOCUMENTS_COACHMARK: CoachmarkStep[] = [
  {
    icon: FolderClock,
    heading: "Never miss a deadline",
    bullets: [
      "Store gas, electrical and other certificates against each property.",
      "We track expiry dates and warn you at 30, 14, 7 and 1 days.",
      "Reminders appear on your dashboard so nothing slips.",
      "Keep tenancy agreements and receipts in one place.",
    ],
  },
];

const REPORTS_COACHMARK: CoachmarkStep[] = [
  {
    icon: FileSpreadsheet,
    heading: "Export-ready statements",
    bullets: [
      "Generate income and expense statements for any date range.",
      "Break expenses down by SA105 box or by property.",
      "Export clean reports to hand straight to your accountant.",
      "Per-property P&L shows profitability and yield.",
    ],
  },
];

const MTD_COACHMARK: CoachmarkStep[] = [
  {
    icon: FileCheck2,
    heading: "Ready for Making Tax Digital",
    bullets: [
      "See what MTD for Income Tax means for landlords.",
      "Quarterly updates are prepared from your live figures.",
      "Stay ahead of submission deadlines with clear status.",
      "We prepare the data — you stay in control of filing.",
    ],
  },
];

/** Registry keyed by section — the client SectionCoachmark resolves steps here. */
export const COACHMARKS: Record<string, CoachmarkStep[]> = {
  properties: PROPERTIES_COACHMARK,
  ownership: OWNERSHIP_COACHMARK,
  tenancies: TENANCIES_COACHMARK,
  transactions: TRANSACTIONS_COACHMARK,
  tax: TAX_COACHMARK,
  documents: DOCUMENTS_COACHMARK,
  reports: REPORTS_COACHMARK,
  mtd: MTD_COACHMARK,
};
