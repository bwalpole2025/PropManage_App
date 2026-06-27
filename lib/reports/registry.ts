// The catalogue of report types — the single source of truth for what reports
// exist, how they're described, which filters they accept, and where they live.
// Client-safe (no prisma / server-only): imported by the catalogue page, the
// dynamic report page, and the filter controls so they all agree on the shape of
// each report. The data builders are wired by slug in services/reports/index.ts.

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BookOpen,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Landmark,
  ListChecks,
  PoundSterling,
  Receipt,
  ScrollText,
  TrendingUp,
} from "lucide-react";

export interface ReportFilterConfig {
  /** Portfolio selector (scopes transactions via property → portfolio). */
  portfolio?: boolean;
  /** Date-range presets + custom from/to. */
  period?: boolean;
  /** Tax-year selector (used instead of `period` for tax-year reports). */
  taxYear?: boolean;
  /** Company selector (Directors' Loans). */
  company?: boolean;
  /** Direction + category selectors (Tracked Transactions). */
  txnFilters?: boolean;
}

export type ReportGroup = "Financial" | "Rental" | "Transactions" | "Tax";

export interface ReportMeta {
  slug: string;
  title: string;
  /** One-line summary for the catalogue card. */
  short: string;
  /** Longer description shown under the report's title. */
  description: string;
  icon: LucideIcon;
  group: ReportGroup;
  filters: ReportFilterConfig;
  /**
   * When set, the report has its own bespoke route (not the dynamic [report]
   * page) — e.g. the Tax Statement with its tax-band controls.
   */
  href?: string;
}

export const REPORT_GROUPS: ReportGroup[] = ["Financial", "Rental", "Transactions", "Tax"];

export const REPORTS: ReportMeta[] = [
  {
    slug: "annual-report",
    title: "Annual Report",
    short: "Year-end overview for a portfolio and tax year.",
    description:
      "A full-year snapshot for a portfolio and tax year: income and expenses by category, per-property profitability, rent collection and the tax position.",
    icon: CalendarRange,
    group: "Financial",
    filters: { taxYear: true, portfolio: true },
  },
  {
    slug: "income-statement",
    title: "Income Statement (P&L)",
    short: "Income and expenses by category, before debt service and capital.",
    description:
      "Profit & loss by category — operating income less operating expenses, before debt service (mortgage interest) and capital expenditure.",
    icon: TrendingUp,
    group: "Financial",
    filters: { period: true, portfolio: true },
  },
  {
    slug: "net-cashflow",
    title: "Net Cashflow",
    short: "Income and expenses by category, net of everything.",
    description:
      "Money in and money out by category — including debt service and capital items — to a single net cashflow figure for the period.",
    icon: ArrowLeftRight,
    group: "Financial",
    filters: { period: true, portfolio: true },
  },
  {
    slug: "monthly-cashflow",
    title: "Monthly Cashflow Statement",
    short: "All payments made and received per calendar month.",
    description:
      "Every payment in and out per calendar month — including personal items and transfers — with running net cashflow.",
    icon: CalendarDays,
    group: "Financial",
    filters: { period: true, portfolio: true },
  },
  {
    slug: "general-ledger",
    title: "General Ledger",
    short: "All transactions, income and expenses, as a running ledger.",
    description:
      "Every transaction line for the period — date, property, category, money in/out and a running balance.",
    icon: BookOpen,
    group: "Transactions",
    filters: { period: true, portfolio: true },
  },
  {
    slug: "tracked-transactions",
    title: "Tracked Transactions",
    short: "View and filter all tracked transactions.",
    description:
      "Your full transaction register with filters for direction, category and portfolio. Excludes deactivated transactions.",
    icon: ListChecks,
    group: "Transactions",
    filters: { period: true, portfolio: true, txnFilters: true },
  },
  {
    slug: "directors-loans",
    title: "Directors' Loans",
    short: "All directors' loan movements by company and director.",
    description:
      "Directors' loan account movements grouped by company and director, with money introduced, drawn and the running balance owed.",
    icon: Landmark,
    group: "Financial",
    filters: { period: true, company: true },
  },
  {
    slug: "rent-received",
    title: "Rent Received",
    short: "Rent received by tenant, dated by rent due date.",
    description:
      "Rent received over the period, dated by the rent due date it satisfies, grouped by tenant and property.",
    icon: PoundSterling,
    group: "Rental",
    filters: { period: true, portfolio: true },
  },
  {
    slug: "rent-roll",
    title: "Rent Roll",
    short: "All tenants and tenancy details, as a snapshot.",
    description:
      "A snapshot of every active tenancy — tenant, property, rent, frequency, deposit and arrears status — with annualised rent.",
    icon: ClipboardList,
    group: "Rental",
    filters: { portfolio: true },
  },
  {
    slug: "tenant-ledger",
    title: "Tenant Ledger",
    short: "All payments and missed payments per tenant.",
    description:
      "Per-tenancy ledger of rent charged versus rent received from the rent schedule, with a running balance and any shortfalls.",
    icon: ScrollText,
    group: "Rental",
    filters: { period: true, portfolio: true },
  },
  {
    slug: "tax-statement",
    title: "Tax Statement",
    short: "Taxable income and allowable expenses in line with SA105.",
    description:
      "Your SA105-aligned tax statement — income, allowable expenses, the finance-cost reducer and per-owner figures.",
    icon: Receipt,
    group: "Tax",
    filters: { taxYear: true },
    href: "/reports/tax-statement",
  },
];

export const REPORTS_BY_SLUG: Record<string, ReportMeta> = Object.fromEntries(
  REPORTS.map((r) => [r.slug, r]),
);

/** Reports that render through the dynamic [report] page (everything with no bespoke href). */
export function dynamicReportSlugs(): string[] {
  return REPORTS.filter((r) => !r.href).map((r) => r.slug);
}
