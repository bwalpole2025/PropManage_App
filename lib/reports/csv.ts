// Generic CSV serialiser for a ReportDocument. Walks every section/table and
// flattens it into rows, formatting cells by their column type (currency → pounds,
// dates → ISO). Used by every report's export route.

import { toCsv } from "@/lib/csv";
import {
  columnAlign,
  type CellValue,
  type ReportColumn,
  type ReportDocument,
  type ReportTable,
} from "./types";

const gbp = (pence: number) => (pence / 100).toFixed(2);

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Format one cell for CSV by its column type. */
export function csvCell(col: ReportColumn, value: CellValue): string | number {
  if (value === null || value === undefined) return "";
  switch (col.type) {
    case "currency":
      return typeof value === "number" ? gbp(value) : String(value);
    case "number":
      return typeof value === "number" ? value : String(value);
    case "date":
      return value instanceof Date ? toISO(value) : String(value);
    default:
      return value instanceof Date ? toISO(value) : value;
  }
}

// Neutralise spreadsheet formula injection: a cell beginning with = + - @ (or a
// leading control char) is run as a formula by Excel/Sheets. Report data includes
// user-controlled names (tenants, owners, properties) and is shared with advisors,
// so prefix such cells with an apostrophe. Genuine numbers (incl. negatives like
// "-4321.00") are left untouched so they stay numeric in the spreadsheet.
// (toCsv already RFC-4180 quote-escapes.)
function safe(v: string | number): string | number {
  if (typeof v !== "string") return v;
  if (/^-?\d{1,}(\.\d+)?$/.test(v)) return v; // a plain number — safe
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

function tableToRows(table: ReportTable): (string | number)[][] {
  const rows: (string | number)[][] = [];
  if (table.title) rows.push([table.title]);
  rows.push(table.columns.map((c) => c.label));
  for (const row of table.rows) {
    rows.push(table.columns.map((c) => csvCell(c, row[c.key])));
  }
  if (table.totals) {
    rows.push(table.columns.map((c) => csvCell(c, table.totals![c.key])));
  }
  if (table.rows.length === 0 && table.emptyText) {
    rows.push([table.emptyText]);
  }
  if (table.note) rows.push([table.note]);
  return rows;
}

/** Serialise a whole report to CSV text. */
export function reportToCsv(doc: ReportDocument): string {
  const rows: (string | number)[][] = [];
  const blank = () => rows.push([]);

  rows.push([doc.title]);
  if (doc.subtitle) rows.push([doc.subtitle]);
  for (const line of doc.meta ?? []) rows.push([line]);

  for (const section of doc.sections) {
    blank();
    if (section.title) rows.push([section.title]);
    if (section.description) rows.push([section.description]);

    for (const item of section.summary ?? []) {
      rows.push([item.label, item.pence !== undefined ? gbp(item.pence) : (item.text ?? "")]);
    }

    for (const table of section.tables ?? []) {
      blank();
      for (const r of tableToRows(table)) rows.push(r);
    }

    if (
      !section.summary?.length &&
      !(section.tables ?? []).some((t) => t.rows.length > 0) &&
      section.emptyText
    ) {
      rows.push([section.emptyText]);
    }
  }

  if (doc.disclaimer) {
    blank();
    rows.push([doc.disclaimer]);
  }

  return toCsv(rows.map((r) => r.map(safe)));
}

/** Suggested download filename for a report's CSV/PDF. */
export function reportFilename(doc: ReportDocument, ext: "csv" | "pdf"): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${doc.slug}-${stamp}.${ext}`;
}

export { columnAlign };
