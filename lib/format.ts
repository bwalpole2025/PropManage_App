// Display formatters. Money is stored as integer pence everywhere.

/** Compose a display name from first/last name, with a sensible fallback. */
export function fullName(
  u: { firstName?: string | null; lastName?: string | null; email?: string | null },
  fallback = "User",
): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return name || u.email || fallback;
}

/** Format integer pence as GBP, e.g. 125000 -> "£1,250.00". */
export function formatPence(
  pence: number,
  opts: { showPence?: boolean } = {},
): string {
  const { showPence = true } = opts;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: showPence ? 2 : 0,
    maximumFractionDigits: showPence ? 2 : 0,
  }).format(pence / 100);
}

/** Compact GBP for KPI tiles, e.g. 1250000 -> "£12,500". */
export function formatPenceCompact(pence: number): string {
  return formatPence(pence, { showPence: false });
}

/** Parse a "1250.50" / "£1,250.50" user input into integer pence. */
export function poundsToPence(input: string): number {
  const cleaned = input.replace(/[£,\s]/g, "").trim();
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateFmtShort = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

export function formatDate(date: Date | string): string {
  return dateFmt.format(new Date(date));
}

export function formatDateShort(date: Date | string): string {
  return dateFmtShort.format(new Date(date));
}

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Date + time, e.g. "05 Jul 2026, 14:32" — distinguishes same-day events. */
export function formatDateTime(date: Date | string): string {
  return dateTimeFmt.format(new Date(date));
}

const monthShortFmt = new Intl.DateTimeFormat("en-GB", { month: "short" });

/** Ordinal day + short month, e.g. "5th Jul", "1st Aug", "22nd Sep". */
export function formatDateOrdinal(date: Date | string): string {
  const d = new Date(date);
  const day = d.getDate();
  const rem100 = day % 100;
  const suffix =
    rem100 >= 11 && rem100 <= 13
      ? "th"
      : day % 10 === 1
        ? "st"
        : day % 10 === 2
          ? "nd"
          : day % 10 === 3
            ? "rd"
            : "th";
  return `${day}${suffix} ${monthShortFmt.format(d)}`;
}

/** Whole-day difference from `now` to `date` (positive = in the future). */
export function daysUntil(date: Date | string, now: Date = new Date()): number {
  const target = new Date(date);
  const ms = target.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Friendly relative phrase, e.g. "in 12 days" / "5 days ago" / "today". */
export function relativeDays(date: Date | string, now: Date = new Date()): string {
  const d = daysUntil(date, now);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  if (d > 0) return `in ${d} days`;
  return `${Math.abs(d)} days ago`;
}

// ---------------------------------------------------------------------------
// UK tax year helpers — the tax year runs 6 April to 5 April.
// ---------------------------------------------------------------------------

/** Tax year for a date, e.g. 2025-07-01 -> "2025-26". */
export function taxYearLabelFor(date: Date = new Date()): string {
  const year = date.getFullYear();
  // Before 6 April the tax year started the previous calendar year.
  const startYear =
    date.getMonth() < 3 || (date.getMonth() === 3 && date.getDate() < 6)
      ? year - 1
      : year;
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endShort}`;
}

/** Start date (6 Apr) of a tax-year label like "2025-26". */
export function taxYearStartDate(label: string): Date {
  const startYear = Number.parseInt(label.slice(0, 4), 10);
  return new Date(Date.UTC(startYear, 3, 6)); // 6 April
}

/** End date (5 Apr next year) of a tax-year label. */
export function taxYearEndDate(label: string): Date {
  const startYear = Number.parseInt(label.slice(0, 4), 10);
  return new Date(Date.UTC(startYear + 1, 3, 5));
}

/** A list of recent tax-year labels (current + previous n), newest first. */
export function recentTaxYears(count = 4, now: Date = new Date()): string[] {
  const current = taxYearLabelFor(now);
  const startYear = Number.parseInt(current.slice(0, 4), 10);
  return Array.from({ length: count }, (_, i) => {
    const y = startYear - i;
    return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
  });
}

/**
 * Tax-year labels from a start year down to an end year, newest first.
 * e.g. taxYearOptions(2026, 2014) -> ["2026-27", "2025-26", …, "2014-15"].
 * Used for the "first tax year to reconcile from" selector.
 */
export function taxYearOptions(fromStartYear = 2026, toStartYear = 2014): string[] {
  const out: string[] = [];
  for (let y = fromStartYear; y >= toStartYear; y--) {
    out.push(`${y}-${String((y + 1) % 100).padStart(2, "0")}`);
  }
  return out;
}
