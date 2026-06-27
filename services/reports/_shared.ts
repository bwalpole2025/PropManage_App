// Small helpers shared by the report builders: the standard subtitle/meta lines
// so every report's header reads consistently (entity · type, period, portfolio,
// generated date), plus the category roll-up + drill-down used by every report
// that breaks figures down "by category".

import { LandlordType, LandlordTypeLabel } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import type { ReportFilters } from "@/lib/reports/filters";
import type { ReportColumn, ReportRow, RowDetail } from "@/lib/reports/types";
import { groupByCategory } from "@/lib/reports/aggregate";
import type { ScopedTxn } from "./data";

export interface ReportEntity {
  id: string;
  displayName: string;
  type: string;
}

export function standardSubtitle(entity: ReportEntity): string {
  const typeLabel =
    LandlordTypeLabel[entity.type as keyof typeof LandlordTypeLabel] ?? entity.type;
  return `${entity.displayName} · ${typeLabel}`;
}

export function isCompanyEntity(entity: ReportEntity): boolean {
  return entity.type === LandlordType.LIMITED_COMPANY;
}

export interface MetaOptions {
  /** Period label override (e.g. for tax-year reports use "Tax year: 2024-25"). */
  periodLine?: string;
  /** Portfolio scope name; omitted when the report isn't portfolio-scoped. */
  portfolioName?: string;
  /** Extra lines appended before the generated-at line. */
  extra?: string[];
  /** Inject "now" for deterministic output. */
  now?: Date;
}

/** Build the standard meta (filter-summary) lines for a report header. */
export function standardMeta(filters: ReportFilters, opts: MetaOptions = {}): string[] {
  const lines: string[] = [];
  lines.push(opts.periodLine ?? `Period: ${filters.period.label}`);
  if (opts.portfolioName) lines.push(`Portfolio: ${opts.portfolioName}`);
  for (const e of opts.extra ?? []) lines.push(e);
  lines.push(`Generated: ${formatDate(opts.now ?? new Date())}`);
  return lines;
}

// ---------------------------------------------------------------------------
// Category roll-up with per-category drill-down.
// ---------------------------------------------------------------------------

/** The property a transaction belongs to, for a detail row. */
export const propertyCell = (t: ScopedTxn) => t.propertyLabel ?? "—";

/** Columns for the "by category" roll-up table (the clickable parent rows). */
export const CATEGORY_TABLE_COLUMNS: ReportColumn[] = [
  { key: "category", label: "Category" },
  { key: "count", label: "Transactions", type: "number" },
  { key: "amount", label: "Amount", type: "currency" },
];

/** Columns for the per-category transaction drill-down. */
export const CATEGORY_DETAIL_COLUMNS: ReportColumn[] = [
  { key: "date", label: "Date", type: "date" },
  { key: "property", label: "Property" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount", type: "currency" },
];

/** Caption inviting the reader to expand a category row. */
export const CATEGORY_DRILLDOWN_NOTE =
  "Select a category to see the transactions behind it.";

/**
 * Group transactions by category for a roll-up table, returning both the
 * summary rows and the transactions behind each category as expandable detail
 * (aligned 1:1 with `rows`). On screen each category row becomes a clickable
 * link that reveals its transactions; CSV/PDF ignore `rowDetails` and export
 * the summary rows only.
 */
export function categoryRowsWithDetail(txns: ScopedTxn[]): {
  rows: ReportRow[];
  rowDetails: (RowDetail | null)[];
  total: number;
} {
  const groups = groupByCategory(txns);
  const byCategory = new Map<string, ScopedTxn[]>();
  for (const t of txns) {
    const key = t.category ?? "__uncat__";
    const list = byCategory.get(key);
    if (list) list.push(t);
    else byCategory.set(key, [t]);
  }

  const rows: ReportRow[] = [];
  const rowDetails: (RowDetail | null)[] = [];
  for (const g of groups) {
    rows.push({ category: g.label, count: g.count, amount: g.amountPence });
    const detailTxns = (byCategory.get(g.category) ?? [])
      .slice()
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    rowDetails.push({
      columns: CATEGORY_DETAIL_COLUMNS,
      rows: detailTxns.map((t) => ({
        date: t.date,
        property: propertyCell(t),
        description: t.description,
        amount: t.amountPence,
      })),
      emptyText: "No transactions in this category.",
    });
  }
  const total = groups.reduce((s, g) => s + g.amountPence, 0);
  return { rows, rowDetails, total };
}
