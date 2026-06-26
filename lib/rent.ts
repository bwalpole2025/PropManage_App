// Pure rent-scheduling helpers. No prisma — unit-testable in isolation.
//
// All date maths is done in UTC (getUTC*/Date.UTC) because tenancy dates enter
// the system as UTC midnight — `<input type=date>` "YYYY-MM-DD" via `new Date()`
// and the importer's `parseImportDate` (Date.UTC) — so reading them with local
// getters would shift the schedule by a day on non-UTC servers.

import { RentFrequency, type RentStatus } from "./enums";
import { rentEntryStatus } from "./rent-matching";

const DAY = 86_400_000;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** A UTC-midnight copy of `d` (date only, time stripped). */
function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** `date` shifted by `n` months, clamping the day to the target month's length. */
function addMonths(date: Date, n: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const targetMonthIndex = m + n;
  const ty = y + Math.floor(targetMonthIndex / 12);
  const tm = ((targetMonthIndex % 12) + 12) % 12;
  const day = Math.min(date.getUTCDate(), daysInMonth(ty, tm));
  return new Date(Date.UTC(ty, tm, day));
}

/**
 * The successive rent due dates for a tenancy, starting at the first on-cadence
 * date on/after `startDate`. Weekly/fortnightly day-step from the start date;
 * monthly/quarterly/annually snap to `rentDueDay` (clamped to month length),
 * stepping on the cadence anchored to the start month. The single source of
 * truth for both `nextDueDate` and `generateRentSchedule` so they cannot drift.
 */
function* dueDatesFrom(
  startDate: Date,
  freq: RentFrequency,
  rentDueDay: number | null,
): Generator<Date> {
  const start = startOfDay(startDate);

  if (freq === RentFrequency.WEEKLY || freq === RentFrequency.FORTNIGHTLY) {
    const stepMs = (freq === RentFrequency.WEEKLY ? 7 : 14) * DAY;
    let t = start.getTime();
    for (let i = 0; i < 100_000; i++) {
      yield new Date(t);
      t += stepMs;
    }
    return;
  }

  const stepMonths =
    freq === RentFrequency.QUARTERLY ? 3 : freq === RentFrequency.ANNUALLY ? 12 : 1;
  const dueDay = rentDueDay ?? startDate.getUTCDate();
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();
  for (let i = 0; i < 100_000; i++) {
    const day = Math.min(dueDay, daysInMonth(year, month));
    const candidate = new Date(Date.UTC(year, month, day));
    // Skip a first period that falls before the start date (e.g. dueDay earlier
    // in the start month than the start day); yield everything from then on.
    if (candidate.getTime() >= start.getTime()) yield candidate;
    month += stepMonths;
    while (month > 11) {
      month -= 12;
      year += 1;
    }
  }
}

/**
 * The first due date in [fromDay, endDay] (both inclusive, UTC midnight), or
 * null if the term ends before the next due date.
 */
function firstDueOnOrAfter(
  startDate: Date,
  freq: RentFrequency,
  rentDueDay: number | null,
  fromDay: Date,
  endDay: Date | null,
): Date | null {
  for (const due of dueDatesFrom(startDate, freq, rentDueDay)) {
    const d = startOfDay(due);
    if (d.getTime() < fromDay.getTime()) continue;
    if (endDay && d.getTime() > endDay.getTime()) return null;
    return due;
  }
  return null;
}

/**
 * The next rent due date for a tenancy. Prefers a stored `nextPaymentDate` when
 * it's today or later; otherwise the first generated due date that is today or
 * later. Not endDate-aware (callers pass active tenancies); use
 * `firstFutureDueDate` for the endDate-aware, nullable variant.
 */
export function nextDueDate(
  tenancy: {
    rentDueDay: number | null;
    rentFrequency: string;
    startDate: Date;
    nextPaymentDate: Date | null;
  },
  now: Date = new Date(),
): Date {
  const today = startOfDay(now);

  if (tenancy.nextPaymentDate) {
    const next = startOfDay(new Date(tenancy.nextPaymentDate));
    if (next.getTime() >= today.getTime()) return next;
  }

  const due = firstDueOnOrAfter(
    new Date(tenancy.startDate),
    tenancy.rentFrequency as RentFrequency,
    tenancy.rentDueDay,
    today,
    null,
  );
  return due ?? today; // null is unreachable with endDay=null
}

/**
 * The first due date on/after today within the tenancy term — used to set
 * `tenancy.nextPaymentDate`. Returns null when the tenancy has ended (the next
 * on-cadence date would fall after `endDate`).
 */
export function firstFutureDueDate(
  tenancy: {
    startDate: Date;
    rentFrequency: string;
    rentDueDay?: number | null;
    endDate?: Date | null;
  },
  now: Date = new Date(),
): Date | null {
  return firstDueOnOrAfter(
    new Date(tenancy.startDate),
    tenancy.rentFrequency as RentFrequency,
    tenancy.rentDueDay ?? null,
    startOfDay(now),
    tenancy.endDate ? startOfDay(new Date(tenancy.endDate)) : null,
  );
}

export interface GeneratedRentEntry {
  dueDate: Date;
  expectedPence: number;
  status: RentStatus;
}

/**
 * The expected-rent schedule for a tenancy across a bounded window
 * [max(startDate, today-monthsBack), min(endDate ?? today+monthsAhead,
 * today+monthsAhead)]. Past periods are OVERDUE (received 0), today/future are
 * DUE — via the shared `rentEntryStatus`. Drives arrears, rent-collection and
 * the calendar's rent-due entries.
 */
export function generateRentSchedule(
  tenancy: {
    startDate: Date;
    endDate?: Date | null;
    rentFrequency: string;
    rentDueDay?: number | null;
    rentPence: number;
  },
  opts: {
    now?: Date;
    monthsBack?: number;
    monthsAhead?: number;
    maxEntries?: number;
  } = {},
): GeneratedRentEntry[] {
  const now = opts.now ?? new Date();
  const monthsBack = opts.monthsBack ?? 12;
  const monthsAhead = opts.monthsAhead ?? 12;
  const maxEntries = opts.maxEntries ?? 240;

  const today = startOfDay(now);
  const start = startOfDay(new Date(tenancy.startDate));
  const horizon = addMonths(today, monthsAhead);
  const windowStart = new Date(
    Math.max(start.getTime(), addMonths(today, -monthsBack).getTime()),
  );
  const end = tenancy.endDate ? startOfDay(new Date(tenancy.endDate)) : null;
  const windowEnd = end && end.getTime() < horizon.getTime() ? end : horizon;

  const out: GeneratedRentEntry[] = [];
  for (const due of dueDatesFrom(
    new Date(tenancy.startDate),
    tenancy.rentFrequency as RentFrequency,
    tenancy.rentDueDay ?? null,
  )) {
    const d = startOfDay(due);
    if (d.getTime() > windowEnd.getTime()) break;
    if (d.getTime() < windowStart.getTime()) continue;
    out.push({
      dueDate: due,
      expectedPence: tenancy.rentPence,
      // `today` (not raw now) so a period due *today* is DUE, not OVERDUE.
      status: rentEntryStatus(0, tenancy.rentPence, d, today),
    });
    if (out.length >= maxEntries) break;
  }
  return out;
}
