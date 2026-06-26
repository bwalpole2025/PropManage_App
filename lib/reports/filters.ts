// Pure parsing/formatting of report filters from URL search params. Shared by the
// report page (to drive the controls) and the services/export route (to scope the
// data). No prisma, no React — just date maths and label strings.

import {
  formatDate,
  taxYearEndDate,
  taxYearLabelFor,
  taxYearStartDate,
} from "@/lib/format";

export type PeriodPreset =
  | "this-tax-year"
  | "last-tax-year"
  | "this-year"
  | "last-12m"
  | "all"
  | "custom";

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  "this-tax-year": "This tax year",
  "last-tax-year": "Last tax year",
  "this-year": "This calendar year",
  "last-12m": "Last 12 months",
  all: "All time",
  custom: "Custom range",
};

export const PERIOD_PRESETS: PeriodPreset[] = [
  "this-tax-year",
  "last-tax-year",
  "this-year",
  "last-12m",
  "all",
  "custom",
];

export interface ResolvedPeriod {
  preset: PeriodPreset;
  /** Inclusive lower bound (start of day) or null for open-ended. */
  from: Date | null;
  /** Inclusive upper bound (end of day) or null for open-ended. */
  to: Date | null;
  /** Display label, e.g. "6 Apr 2024 – 5 Apr 2025" or "All time". */
  label: string;
}

export interface ReportFilters {
  period: ResolvedPeriod;
  /** "" / undefined = all portfolios. */
  portfolioId?: string;
  /** For tax-year-scoped reports (e.g. Annual Report). */
  taxYear?: string;
  companyId?: string;
  direction?: string;
  category?: string;
  status?: string;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const TAX_YEAR_RE = /^\d{4}-\d{2}$/;

/** Parse "yyyy-mm-dd" to a UTC start-of-day Date, or null. */
export function parseISODate(value: string | undefined | null): Date | null {
  if (!value || !ISO_RE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a Date as "yyyy-mm-dd" (UTC). */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}
function endOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function rangeLabel(from: Date | null, to: Date | null): string {
  if (!from && !to) return "All time";
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
  if (from) return `From ${formatDate(from)}`;
  return `Until ${formatDate(to as Date)}`;
}

/**
 * Resolve a period preset (+ optional custom from/to) into a concrete window.
 * `now` is injectable for deterministic tests.
 */
export function resolvePeriod(
  preset: PeriodPreset,
  customFrom: string | undefined,
  customTo: string | undefined,
  now: Date = new Date(),
): ResolvedPeriod {
  let from: Date | null = null;
  let to: Date | null = null;

  switch (preset) {
    case "this-tax-year": {
      const ty = taxYearLabelFor(now);
      from = startOfDay(taxYearStartDate(ty));
      to = endOfDay(taxYearEndDate(ty));
      break;
    }
    case "last-tax-year": {
      const currentStartYear = Number.parseInt(taxYearLabelFor(now).slice(0, 4), 10);
      const ty = `${currentStartYear - 1}-${String(currentStartYear % 100).padStart(2, "0")}`;
      from = startOfDay(taxYearStartDate(ty));
      to = endOfDay(taxYearEndDate(ty));
      break;
    }
    case "this-year": {
      const y = now.getUTCFullYear();
      from = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
      to = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      break;
    }
    case "last-12m": {
      to = endOfDay(now);
      const f = new Date(now);
      f.setUTCFullYear(f.getUTCFullYear() - 1);
      from = startOfDay(f);
      break;
    }
    case "all": {
      from = null;
      to = null;
      break;
    }
    case "custom": {
      const f = parseISODate(customFrom);
      const t = parseISODate(customTo);
      from = f ? startOfDay(f) : null;
      to = t ? endOfDay(t) : null;
      break;
    }
  }

  return { preset, from, to, label: rangeLabel(from, to) };
}

function isPeriodPreset(value: string | undefined): value is PeriodPreset {
  return !!value && (PERIOD_PRESETS as string[]).includes(value);
}

/** Parse the report's search params into a resolved filter set. */
export function parseReportFilters(
  sp: Record<string, string | undefined>,
  now: Date = new Date(),
): ReportFilters {
  const preset: PeriodPreset = isPeriodPreset(sp.period) ? sp.period : "this-tax-year";
  const period = resolvePeriod(preset, sp.from, sp.to, now);
  return {
    period,
    portfolioId: sp.portfolioId || undefined,
    taxYear: sp.ty && TAX_YEAR_RE.test(sp.ty) ? sp.ty : undefined,
    companyId: sp.companyId || undefined,
    direction: sp.direction || undefined,
    category: sp.category || undefined,
    status: sp.status || undefined,
  };
}

/** Re-emit the active filters as a query string (for export links). */
export function filtersToQuery(
  sp: Record<string, string | undefined>,
): string {
  const out = new URLSearchParams();
  for (const key of ["period", "from", "to", "portfolioId", "ty", "companyId", "direction", "category", "status"]) {
    const v = sp[key];
    if (v) out.set(key, v);
  }
  return out.toString();
}
