// Pure timezone-scheduling helpers. No prisma / no I/O — unit-testable.
//
// "Respect the account time zone for scheduling" means the daily reminder
// sweeps fire once per account at a consistent *local* time, and that "N days
// before" offsets are measured against the account's local calendar day rather
// than the server's. All helpers here turn an absolute instant + an IANA time
// zone into the account-local calendar fields needed for those decisions.

/** The hour (account-local, 0–23) at which daily reminder sweeps deliver. */
export const DEFAULT_SEND_HOUR = 8;

export interface ZonedParts {
  year: number;
  month: number; // 1–12
  day: number; // 1–31
  hour: number; // 0–23
  /** "YYYY-MM-DD" in the given zone — a stable per-local-day key. */
  ymd: string;
}

const partsCache = new Map<string, Intl.DateTimeFormat>();
function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let fmt = partsCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
    });
    partsCache.set(timeZone, fmt);
  }
  return fmt;
}

/** The calendar fields of `instant` as observed in `timeZone`. */
export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  let hour = get("hour");
  // Intl renders midnight as "24" in some en-GB locales/zones; normalise.
  if (hour === 24) hour = 0;
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const ymd = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  return { year, month, day, hour, ymd };
}

/** "YYYY-MM-DD" for `instant` in `timeZone` — a per-local-day dedup component. */
export function localDateKey(instant: Date, timeZone: string): string {
  return zonedParts(instant, timeZone).ymd;
}

/**
 * Whether it is at or past the account-local `sendHour` — the gate that holds
 * daily reminder deliveries back until a civilised local hour. Using `>=` (not
 * an exact-hour match) keeps it robust: any sweep from `sendHour` onward that
 * local day will deliver, and per-event dedup ensures it still fires only once.
 * Combined with the time-zone-aware day arithmetic in `localDaysUntil`, this is
 * how the sweeps "respect the account time zone for scheduling".
 */
export function isAfterSendHour(
  instant: Date,
  timeZone: string,
  sendHour: number = DEFAULT_SEND_HOUR,
): boolean {
  return zonedParts(instant, timeZone).hour >= sendHour;
}

/** Whole-day difference between two `{year,month,day}` calendar dates (b − a). */
function daysBetween(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number },
): number {
  const ua = Date.UTC(a.year, a.month - 1, a.day);
  const ub = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((ub - ua) / 86_400_000);
}

/** The UTC calendar fields of a stored date (our dates are UTC-midnight). */
function utcParts(date: Date): { year: number; month: number; day: number } {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/**
 * Whole calendar days from `now` (account-local today) until `target` (a stored
 * UTC-midnight date such as an expiry/due/deadline), measured in `timeZone`.
 * 0 = target's local day is today, positive = future, negative = past.
 */
export function localDaysUntil(
  target: Date,
  now: Date,
  timeZone: string,
): number {
  const today = zonedParts(now, timeZone);
  return daysBetween(today, utcParts(target));
}
