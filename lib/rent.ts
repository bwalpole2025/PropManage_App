// Pure rent-scheduling helpers. No prisma — unit-testable in isolation.

import { RentFrequency } from "./enums";

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** A local-midnight copy of `d` (date only, time stripped). */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * The next rent due date for a tenancy (the schedule may not extend into the
 * future, so this is derived). Prefers a stored `nextPaymentDate` when it's
 * today or later; otherwise advances from `startDate` by the rent frequency
 * until the date is today or later. Monthly snaps to `rentDueDay` (clamped to
 * the month length); times use noon to stay clear of DST edges.
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

  const freq = tenancy.rentFrequency as RentFrequency;
  const start = new Date(tenancy.startDate);

  // Day-stepping frequencies (weekly / fortnightly): advance from startDate.
  if (freq === RentFrequency.WEEKLY || freq === RentFrequency.FORTNIGHTLY) {
    const stepDays = freq === RentFrequency.WEEKLY ? 7 : 14;
    const stepMs = stepDays * 24 * 60 * 60 * 1000;
    const s = startOfDay(start);
    if (s.getTime() >= today.getTime()) return s;
    const periods = Math.ceil((today.getTime() - s.getTime()) / stepMs);
    return new Date(s.getTime() + periods * stepMs);
  }

  // Month-stepping frequencies (monthly / quarterly / annually).
  const stepMonths =
    freq === RentFrequency.QUARTERLY ? 3 : freq === RentFrequency.ANNUALLY ? 12 : 1;
  const dueDay = tenancy.rentDueDay ?? start.getDate();

  // Start from the current month's due day, then step forward until >= today.
  let year = today.getFullYear();
  let month = today.getMonth();
  // Align month to the tenancy's cadence relative to its start month.
  if (stepMonths > 1) {
    const startTotal = start.getFullYear() * 12 + start.getMonth();
    const todayTotal = year * 12 + month;
    const offset = ((todayTotal - startTotal) % stepMonths + stepMonths) % stepMonths;
    month -= offset; // back to the most recent on-cadence month
    while (month < 0) {
      month += 12;
      year -= 1;
    }
  }

  for (let i = 0; i < 64; i++) {
    const day = Math.min(dueDay, daysInMonth(year, month));
    const candidate = new Date(year, month, day, 12);
    if (startOfDay(candidate).getTime() >= today.getTime()) {
      return new Date(year, month, day);
    }
    month += stepMonths;
    while (month > 11) {
      month -= 12;
      year += 1;
    }
  }
  // Fallback (should not be reached): today.
  return today;
}
