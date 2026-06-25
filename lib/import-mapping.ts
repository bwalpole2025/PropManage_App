// Pure mapping + validation for the spreadsheet importer. NO prisma / react /
// node imports, so it runs identically in the client wizard (live preview) and
// the server commit action (authoritative). The server NEVER trusts client-
// computed direction/amount/category — it re-runs validateRow on the raw cells.

import { poundsToPence } from "./format";
import { allCategoryDirection, allCategoryLabel, isKnownCategory } from "./categories";
import { TxnDirection } from "./enums";
import type { AllCategory } from "./categories";

export const IMPORT_FIELDS = [
  { key: "date", label: "Date", required: true },
  { key: "description", label: "Description", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "category", label: "Category", required: false },
  { key: "property", label: "Property", required: false },
  { key: "tenancy", label: "Tenancy", required: false },
  { key: "merchant", label: "Merchant", required: false },
  { key: "notes", label: "Notes", required: false },
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number]["key"];

/** field → source column index in the parsed rows (null/undefined = unmapped). */
export type ColumnMapping = Partial<Record<ImportField, number | null>>;

/** Header aliases for auto-detection (lowercased). */
const ALIASES: Record<ImportField, string[]> = {
  date: ["date", "transaction date", "paid on", "posted", "value date"],
  description: ["description", "details", "narrative", "reference", "memo"],
  amount: ["amount", "value", "total", "paid", "gbp", "£", "amount (£)", "debit/credit"],
  category: ["category", "type", "sa105"],
  property: ["property", "address", "property address"],
  tenancy: ["tenancy", "tenant", "tenant name"],
  merchant: ["merchant", "payee", "counterparty"],
  notes: ["notes", "note", "comment"],
};

export function detectMapping(headers: string[]): ColumnMapping {
  const norm = headers.map((h) => (h ?? "").trim().toLowerCase());
  const mapping: ColumnMapping = {};
  for (const field of IMPORT_FIELDS) {
    const idx = norm.findIndex((h) => ALIASES[field.key].includes(h));
    if (idx >= 0) mapping[field.key] = idx;
  }
  return mapping;
}

export interface RawImportRow {
  rowNumber: number; // 1-based source row, for error reporting
  date: string;
  description: string;
  amount: string;
  category?: string;
  property?: string;
  tenancy?: string;
  merchant?: string;
  notes?: string;
  receiptFileId?: string | null;
  allowDuplicate?: boolean;
}

export interface ParsedRow {
  rowNumber: number;
  date: Date;
  description: string;
  amountPence: number; // always positive
  direction: TxnDirection;
  category: AllCategory | null;
  propertyId: string | null;
  tenancyId: string | null;
  merchant: string | null;
  notes: string | null;
  receiptFileId: string | null;
  allowDuplicate: boolean;
}

export interface FieldError {
  field: ImportField | "row";
  message: string;
}

export interface RowResult {
  ok: boolean;
  value?: ParsedRow;
  errors: FieldError[];
}

export interface ValidateContext {
  properties: { id: string; addressLine1: string }[];
  tenancies: { id: string; label: string }[];
}

/** Build a RawImportRow from a parsed AOA row + the column mapping. */
export function toRawRow(
  cells: string[],
  mapping: ColumnMapping,
  rowNumber: number,
): RawImportRow {
  const at = (f: ImportField) => {
    const idx = mapping[f];
    return idx == null ? "" : (cells[idx] ?? "").toString();
  };
  return {
    rowNumber,
    date: at("date"),
    description: at("description"),
    amount: at("amount"),
    category: at("category"),
    property: at("property"),
    tenancy: at("tenancy"),
    merchant: at("merchant"),
    notes: at("notes"),
  };
}

// Proper thousands grouping or plain digits, optional 1-2 decimals; rejects
// garbage like "1,2,3" and "5." that would otherwise slip through.
const AMOUNT_RE = /^-?£?(\d{1,3}(,\d{3})*|\d+)(\.\d{1,2})?$/;

function makeUtcDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  // Reject overflow (e.g. 31/02 rolling into March).
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d;
}

/**
 * Parse an import date deterministically at UTC midnight. Accepts ISO
 * YYYY-MM-DD and UK DD/MM/YYYY (also - or .). Avoids the silent mis-parsing of
 * `new Date("06/04/2026")` (US M/D) for UK spreadsheets. Returns null if invalid.
 */
export function parseImportDate(input: string): Date | null {
  const s = (input ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return makeUtcDate(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    let year = +m[3];
    if (year < 100) year += 2000;
    return makeUtcDate(year, +m[2], +m[1]); // UK day/month order
  }
  // Fallback for textual dates (e.g. "2 Mar 2026").
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function validateRow(raw: RawImportRow, ctx: ValidateContext): RowResult {
  const errors: FieldError[] = [];

  const dateStr = raw.date?.trim() ?? "";
  const desc = raw.description?.trim() ?? "";
  const amountStr = raw.amount?.trim() ?? "";

  if (!dateStr) errors.push({ field: "date", message: "Date is required" });
  if (!desc) errors.push({ field: "description", message: "Description is required" });
  if (!amountStr) errors.push({ field: "amount", message: "Amount is required" });

  const date = parseImportDate(dateStr);
  if (dateStr && !date) {
    errors.push({
      field: "date",
      message: `Unparseable date "${dateStr}" (use YYYY-MM-DD or DD/MM/YYYY)`,
    });
  }

  // Validate the amount BEFORE poundsToPence (which returns 0 on NaN).
  if (amountStr && !AMOUNT_RE.test(amountStr.replace(/\s+/g, ""))) {
    errors.push({ field: "amount", message: `"${amountStr}" is not a number` });
  }
  const amountPence = Math.abs(poundsToPence(amountStr));
  if (amountStr && AMOUNT_RE.test(amountStr.replace(/\s+/g, "")) && amountPence === 0) {
    errors.push({ field: "amount", message: "Amount must be non-zero" });
  }

  const rawCategory = raw.category?.trim() ?? "";
  let category: AllCategory | null = null;
  if (rawCategory) {
    if (isKnownCategory(rawCategory)) {
      category = rawCategory;
    } else {
      errors.push({
        field: "category",
        message: `Unknown category "${rawCategory}" (e.g. ${Object.keys(allCategoryLabel)[0]})`,
      });
    }
  }

  let propertyId: string | null = null;
  const rawProp = raw.property?.trim().toLowerCase() ?? "";
  if (rawProp) {
    const match = ctx.properties.find(
      (p) => p.addressLine1.trim().toLowerCase() === rawProp,
    );
    if (match) propertyId = match.id;
    else errors.push({ field: "property", message: `No property "${raw.property}"` });
  }

  let tenancyId: string | null = null;
  const rawTen = raw.tenancy?.trim().toLowerCase() ?? "";
  if (rawTen) {
    const match = ctx.tenancies.find(
      (t) => t.label.trim().toLowerCase() === rawTen,
    );
    if (match) tenancyId = match.id;
    else errors.push({ field: "tenancy", message: `No tenancy "${raw.tenancy}"` });
  }

  if (errors.length > 0 || !date) return { ok: false, errors };

  const direction = category
    ? allCategoryDirection[category]
    : amountStr.trim().startsWith("-")
      ? TxnDirection.EXPENSE
      : TxnDirection.INCOME;

  return {
    ok: true,
    errors: [],
    value: {
      rowNumber: raw.rowNumber,
      date,
      description: desc,
      amountPence,
      direction,
      category,
      propertyId,
      tenancyId,
      merchant: raw.merchant?.trim() || null,
      notes: raw.notes?.trim() || null,
      receiptFileId: raw.receiptFileId ?? null,
      allowDuplicate: !!raw.allowDuplicate,
    },
  };
}

/** Natural dedup key: date(day) + amount + lowercased description + property. */
export function dedupKey(r: {
  date: Date | string;
  amountPence: number;
  description: string;
  propertyId?: string | null;
  tenancyId?: string | null;
  merchant?: string | null;
}): string {
  const day =
    typeof r.date === "string" ? r.date.slice(0, 10) : r.date.toISOString().slice(0, 10);
  return [day, r.amountPence, r.description.trim().toLowerCase(), r.propertyId ?? "", r.tenancyId ?? "", (r.merchant ?? "").trim().toLowerCase()].join(
    " ",
  );
}

export interface ImportSummary {
  valid: number;
  errorCount: number;
  duplicateCount: number;
}

/** Count valid / error / duplicate rows (duplicates are advisory, not errors). */
export function summarise(
  results: RowResult[],
  existingKeys: Set<string> = new Set(),
): ImportSummary {
  let valid = 0;
  let errorCount = 0;
  let duplicateCount = 0;
  const seen = new Set<string>();
  for (const r of results) {
    if (!r.ok || !r.value) {
      errorCount++;
      continue;
    }
    const key = dedupKey(r.value);
    if (existingKeys.has(key) || seen.has(key)) duplicateCount++;
    else valid++;
    seen.add(key);
  }
  return { valid, errorCount, duplicateCount };
}
