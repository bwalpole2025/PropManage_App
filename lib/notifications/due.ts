// Pure due-selection: given candidate rows that each carry a target date, decide
// which reminder-offset "bucket" (if any) they currently fall into for the
// account's time zone. No prisma — unit-testable.
//
// The scheduled sweeps query a coarse window of candidates from the DB, then run
// them through `selectDueReminders`. The matched `offsetDays` becomes part of
// the dispatch dedup key, so the 14/7/1-day nudges are independent and each
// lands exactly once. The bucket rule (`offset >= daysUntil`) is robust to a
// missed sweep: if the exact boundary day is skipped, the next sweep still maps
// the item to the same not-yet-sent bucket and catches up.

import { localDaysUntil } from "./schedule";

/** Lead times (local days before the date) for each reminder kind. */
export const RENT_REMINDER_OFFSETS = [3] as const;
export const MTD_REMINDER_OFFSETS = [14, 7, 1] as const;
export const BANK_CONSENT_OFFSETS = [14, 7, 1] as const;
/** The widest offset across all kinds — the size of the DB candidate window. */
export const MAX_REMINDER_OFFSET = 30;

/**
 * The bucket an item `daysUntil` away maps to: the *smallest* configured offset
 * that is still ≥ `daysUntil` (the most urgent nudge not yet reached). Returns
 * null when the target is in the past or further out than the widest offset.
 *
 *   offsets [14,7,1], daysUntil 10 → 14   (entered the 14-day window)
 *   offsets [14,7,1], daysUntil 7  → 7
 *   offsets [14,7,1], daysUntil 5  → 7    (still the 7-day bucket; 1 not reached)
 *   offsets [14,7,1], daysUntil 0  → 1
 *   offsets [14,7,1], daysUntil 20 → null (not yet in range)
 */
export function offsetBucket(
  daysUntil: number,
  offsets: readonly number[],
): number | null {
  if (daysUntil < 0) return null;
  let best: number | null = null;
  for (const o of offsets) {
    if (o >= daysUntil && (best === null || o < best)) best = o;
  }
  return best;
}

export interface DueReminder<T> {
  item: T;
  offsetDays: number;
}

/**
 * Items currently inside a reminder window, each tagged with the matched bucket.
 * `getDate` extracts the item's target date; days-until is measured in
 * `timeZone` so the window boundaries follow the account's local calendar.
 */
export function selectDueReminders<T>(
  items: readonly T[],
  getDate: (item: T) => Date,
  now: Date,
  timeZone: string,
  offsets: readonly number[],
): DueReminder<T>[] {
  const out: DueReminder<T>[] = [];
  for (const item of items) {
    const days = localDaysUntil(getDate(item), now, timeZone);
    const bucket = offsetBucket(days, offsets);
    if (bucket !== null) out.push({ item, offsetDays: bucket });
  }
  return out;
}
