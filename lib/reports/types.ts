// The shared "report document" data structure. Every report — Annual Report,
// General Ledger, Rent Roll, … — is built into this one shape, which then renders
// three ways from a single source of truth: on-screen (components/reports/report-view),
// to CSV (lib/reports/csv) and to PDF (lib/reports/pdf). Keeping the structure
// uniform is what lets all eleven reports share one renderer, one exporter and one
// page, so a new report is "write a builder that returns a ReportDocument".
//
// Money is carried as integer pence (number) in currency cells and formatted at
// the edges; dates are carried as `Date` and formatted per output.

export type CellAlign = "left" | "right" | "center";
export type ColumnType = "text" | "currency" | "number" | "date";

export interface ReportColumn {
  key: string;
  label: string;
  /** How the cell value is interpreted/formatted. Defaults to "text". */
  type?: ColumnType;
  /** Override alignment; currency/number default to right, others to left. */
  align?: CellAlign;
  /** Hint (in chars) for PDF column width; optional. */
  widthChars?: number;
}

export type CellValue = string | number | Date | null | undefined;
export type ReportRow = Record<string, CellValue>;

export interface ReportTable {
  title?: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  /** Optional totals/footer row, keyed by column key. */
  totals?: ReportRow;
  /** Shown when `rows` is empty (instead of the table). */
  emptyText?: string;
  /** Small caption printed under the table. */
  note?: string;
}

export interface SummaryItem {
  label: string;
  /** When set, formatted as GBP currency from integer pence. */
  pence?: number;
  /** Plain-text value (used when `pence` is undefined). */
  text?: string;
  emphasis?: boolean;
  tone?: "income" | "expense" | "auto" | "muted";
}

export interface ReportSection {
  title?: string;
  description?: string;
  /** Key figures shown as a stat grid above any tables. */
  summary?: SummaryItem[];
  tables?: ReportTable[];
  /** Shown when the section has no summary and no non-empty tables. */
  emptyText?: string;
}

export interface ReportDocument {
  slug: string;
  title: string;
  /** Entity name + scope line. */
  subtitle?: string;
  /** Filter summary lines (period, portfolio, generated-at). */
  meta?: string[];
  sections: ReportSection[];
  disclaimer?: string;
}

/** Default alignment for a column, honouring an explicit override. */
export function columnAlign(col: ReportColumn): CellAlign {
  if (col.align) return col.align;
  return col.type === "currency" || col.type === "number" ? "right" : "left";
}
