// Pure per-property helpers (no prisma) shared by the properties services and
// unit-tested in isolation.

import { RentPeriodsPerYear, TenancyStatus, type RentFrequency } from "./enums";

export type OccupancyStatus = "Occupied" | "Vacant";

/** Sum of ACTIVE tenancies' rent, normalised to a monthly figure (pence). */
export function normaliseMonthlyRentPence(
  tenancies: { status: string; rentPence: number; rentFrequency: string }[],
): number {
  return tenancies
    .filter((t) => t.status === TenancyStatus.ACTIVE)
    .reduce((sum, t) => {
      const perYear = RentPeriodsPerYear[t.rentFrequency as RentFrequency] ?? 12;
      return sum + Math.round((t.rentPence * perYear) / 12);
    }, 0);
}

/** A property is Occupied if it has any ACTIVE tenancy, else Vacant. */
export function occupancyOf(tenancies: { status: string }[]): OccupancyStatus {
  return tenancies.some((t) => t.status === TenancyStatus.ACTIVE)
    ? "Occupied"
    : "Vacant";
}

/**
 * Whether a date falls within a tax-year window. `end` is the 5 Apr midnight
 * from taxYearEndDate; we treat the whole of 5 Apr as in-window (so timestamped
 * transactions on the last day aren't dropped) by using an exclusive next-day bound.
 */
export function inTaxYearWindow(date: Date, start: Date, end: Date): boolean {
  const t = date.getTime();
  return t >= start.getTime() && t < end.getTime() + 86_400_000;
}
