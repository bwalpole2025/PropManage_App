// Pure mapping + validation for the tenancy spreadsheet importer. No prisma /
// react / node, so it runs identically in the client wizard (live preview) and
// the server commit (authoritative). Mirrors lib/property-import-mapping.ts.

import { poundsToPence } from "./format";
import { parseImportDate } from "./import-mapping";
import { propertyDedupKey } from "./property-import-mapping";
import { RentFrequency } from "./enums";

export const TENANCY_IMPORT_FIELDS = [
  { key: "tenantName", label: "Tenant name", required: true },
  { key: "tenantEmail", label: "Tenant email", required: false },
  { key: "propertyAddress", label: "Property address", required: true },
  { key: "postcode", label: "Postcode", required: true },
  { key: "rent", label: "Rent", required: true },
  { key: "frequency", label: "Frequency", required: false },
  { key: "deposit", label: "Deposit", required: false },
  { key: "startDate", label: "Start date", required: true },
  { key: "endDate", label: "End date", required: false },
  { key: "rentDueDay", label: "Rent due day", required: false },
] as const;
export type TenancyImportField = (typeof TENANCY_IMPORT_FIELDS)[number]["key"];
export type TenancyColumnMapping = Partial<
  Record<TenancyImportField, number | null>
>;

const ALIASES: Record<TenancyImportField, string[]> = {
  tenantName: ["tenant name", "tenant", "lead tenant", "name"],
  tenantEmail: ["tenant email", "email", "e-mail"],
  propertyAddress: [
    "property address",
    "address",
    "address line 1",
    "property",
    "street",
  ],
  postcode: ["postcode", "post code", "zip", "postal code"],
  rent: ["rent", "rent amount", "monthly rent", "amount"],
  frequency: ["frequency", "rent frequency", "period"],
  deposit: ["deposit", "deposit amount"],
  startDate: ["start date", "start", "tenancy start", "from"],
  endDate: ["end date", "end", "tenancy end", "to"],
  rentDueDay: ["rent due day", "due day", "payment day"],
};

export function detectTenancyMapping(headers: string[]): TenancyColumnMapping {
  const norm = headers.map((h) => (h ?? "").trim().toLowerCase());
  const mapping: TenancyColumnMapping = {};
  for (const f of TENANCY_IMPORT_FIELDS) {
    const idx = norm.findIndex((h) => ALIASES[f.key].includes(h));
    if (idx >= 0) mapping[f.key] = idx;
  }
  return mapping;
}

export interface RawTenancyRow {
  rowNumber: number;
  tenantName: string;
  tenantEmail?: string;
  propertyAddress: string;
  postcode: string;
  rent: string;
  frequency?: string;
  deposit?: string;
  startDate: string;
  endDate?: string;
  rentDueDay?: string;
}

export interface ParsedTenancyRow {
  rowNumber: number;
  tenantName: string;
  tenantEmail: string | null;
  propertyId: string;
  rentPence: number;
  rentFrequency: RentFrequency;
  depositPence: number | null;
  startDate: Date;
  endDate: Date | null;
  rentDueDay: number | null;
}

export function toRawTenancyRow(
  cells: string[],
  mapping: TenancyColumnMapping,
  rowNumber: number,
): RawTenancyRow {
  const at = (f: TenancyImportField) => {
    const idx = mapping[f];
    return idx == null ? "" : (cells[idx] ?? "").toString();
  };
  return {
    rowNumber,
    tenantName: at("tenantName"),
    tenantEmail: at("tenantEmail"),
    propertyAddress: at("propertyAddress"),
    postcode: at("postcode"),
    rent: at("rent"),
    frequency: at("frequency"),
    deposit: at("deposit"),
    startDate: at("startDate"),
    endDate: at("endDate"),
    rentDueDay: at("rentDueDay"),
  };
}

const AMOUNT_RE = /^-?£?(\d{1,3}(,\d{3})*|\d+)(\.\d{1,2})?$/;

const FREQ_WORDS: Record<string, RentFrequency> = {
  weekly: RentFrequency.WEEKLY,
  week: RentFrequency.WEEKLY,
  fortnightly: RentFrequency.FORTNIGHTLY,
  biweekly: RentFrequency.FORTNIGHTLY,
  monthly: RentFrequency.MONTHLY,
  month: RentFrequency.MONTHLY,
  quarterly: RentFrequency.QUARTERLY,
  quarter: RentFrequency.QUARTERLY,
  annually: RentFrequency.ANNUALLY,
  annual: RentFrequency.ANNUALLY,
  yearly: RentFrequency.ANNUALLY,
  year: RentFrequency.ANNUALLY,
};

function parseFrequency(raw: string): RentFrequency | "invalid" | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null; // blank → caller defaults to MONTHLY
  const upper = s.toUpperCase();
  if (Object.prototype.hasOwnProperty.call(RentFrequency, upper)) {
    return RentFrequency[upper as keyof typeof RentFrequency];
  }
  if (Object.prototype.hasOwnProperty.call(FREQ_WORDS, s)) return FREQ_WORDS[s];
  return "invalid";
}

export interface TenancyFieldError {
  field: TenancyImportField | "row";
  message: string;
}
export interface TenancyRowResult {
  ok: boolean;
  value?: ParsedTenancyRow;
  errors: TenancyFieldError[];
}

export interface TenancyValidateContext {
  properties: { id: string; addressLine1: string; postcode: string }[];
}

export function validateTenancyRow(
  raw: RawTenancyRow,
  ctx: TenancyValidateContext,
): TenancyRowResult {
  const errors: TenancyFieldError[] = [];
  const tenantName = raw.tenantName?.trim() ?? "";
  const propertyAddress = raw.propertyAddress?.trim() ?? "";
  const postcode = raw.postcode?.trim() ?? "";
  const rentStr = raw.rent?.trim() ?? "";
  const startStr = raw.startDate?.trim() ?? "";

  if (!tenantName)
    errors.push({ field: "tenantName", message: "Tenant name is required" });

  // Match the property by address + postcode (no auto-create).
  let propertyId = "";
  if (!propertyAddress || !postcode) {
    errors.push({
      field: "propertyAddress",
      message: "Property address and postcode are required",
    });
  } else {
    const wanted = propertyDedupKey({ addressLine1: propertyAddress, postcode });
    const match = ctx.properties.find(
      (p) =>
        propertyDedupKey({ addressLine1: p.addressLine1, postcode: p.postcode }) ===
        wanted,
    );
    if (match) propertyId = match.id;
    else
      errors.push({
        field: "propertyAddress",
        message: `No matching property for "${propertyAddress}, ${postcode}"`,
      });
  }

  // Rent.
  let rentPence = 0;
  if (!rentStr) {
    errors.push({ field: "rent", message: "Rent is required" });
  } else if (!AMOUNT_RE.test(rentStr.replace(/\s+/g, ""))) {
    errors.push({ field: "rent", message: `"${rentStr}" is not a number` });
  } else {
    rentPence = Math.abs(poundsToPence(rentStr));
    if (rentPence === 0)
      errors.push({ field: "rent", message: "Rent must be non-zero" });
  }

  // Frequency (optional, defaults to MONTHLY).
  const freq = parseFrequency(raw.frequency ?? "");
  if (freq === "invalid")
    errors.push({
      field: "frequency",
      message: `Unknown frequency "${raw.frequency}"`,
    });
  const rentFrequency = freq && freq !== "invalid" ? freq : RentFrequency.MONTHLY;

  // Deposit (optional).
  let depositPence: number | null = null;
  const depositStr = raw.deposit?.trim() ?? "";
  if (depositStr) {
    if (!AMOUNT_RE.test(depositStr.replace(/\s+/g, ""))) {
      errors.push({ field: "deposit", message: `"${depositStr}" is not a number` });
    } else {
      depositPence = Math.abs(poundsToPence(depositStr));
    }
  }

  // Dates.
  const startDate = parseImportDate(startStr);
  if (!startStr)
    errors.push({ field: "startDate", message: "Start date is required" });
  else if (!startDate)
    errors.push({
      field: "startDate",
      message: `Unparseable date "${startStr}" (use YYYY-MM-DD or DD/MM/YYYY)`,
    });

  let endDate: Date | null = null;
  const endStr = raw.endDate?.trim() ?? "";
  if (endStr) {
    endDate = parseImportDate(endStr);
    if (!endDate)
      errors.push({
        field: "endDate",
        message: `Unparseable date "${endStr}"`,
      });
  }

  // Rent due day (optional).
  let rentDueDay: number | null = null;
  const dueStr = raw.rentDueDay?.trim() ?? "";
  if (dueStr) {
    if (!/^\d+$/.test(dueStr) || Number(dueStr) < 1 || Number(dueStr) > 31) {
      errors.push({ field: "rentDueDay", message: `Invalid due day "${dueStr}"` });
    } else rentDueDay = Number(dueStr);
  }

  if (errors.length > 0 || !startDate || !propertyId) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    errors: [],
    value: {
      rowNumber: raw.rowNumber,
      tenantName,
      tenantEmail: raw.tenantEmail?.trim() || null,
      propertyId,
      rentPence,
      rentFrequency,
      depositPence,
      startDate,
      endDate,
      rentDueDay,
    },
  };
}

/** Dedup key for a tenancy = property + lead-tenant + start date. */
export function tenancyDedupKey(r: {
  propertyId: string;
  tenantName: string;
  startDate: Date | string;
}): string {
  const day =
    typeof r.startDate === "string"
      ? r.startDate.slice(0, 10)
      : r.startDate.toISOString().slice(0, 10);
  return [r.propertyId, r.tenantName.trim().toLowerCase(), day].join("|");
}
