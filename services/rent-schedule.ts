import type { PrismaTx } from "@/lib/db";
import { generateRentSchedule, firstFutureDueDate } from "@/lib/rent";

export interface RentScheduleParams {
  startDate: Date;
  endDate?: Date | null;
  rentFrequency: string;
  rentDueDay?: number | null;
  rentPence: number;
}

/**
 * (Re)generate a tenancy's expected-rent schedule. Idempotent and safe to call
 * on edit: it deletes only FUTURE, UNMATCHED entries (no payments, no matched
 * transactions, dueDate today-or-later) so reconciled/past periods are
 * preserved, then re-inserts the generated window. `createMany({skipDuplicates})`
 * relies on `@@unique([tenancyId, dueDate])` so preserved periods aren't
 * clobbered. Returns the first future due date (for `tenancy.nextPaymentDate`).
 *
 * MUST be called inside a `prisma.$transaction`.
 */
export async function syncRentSchedule(
  tx: PrismaTx,
  tenancyId: string,
  params: RentScheduleParams,
  now: Date = new Date(),
): Promise<Date | null> {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  await tx.rentScheduleEntry.deleteMany({
    where: {
      tenancyId,
      dueDate: { gte: today },
      receivedPence: 0,
      matchedTransactionIds: { equals: [] },
    },
  });

  const rows = generateRentSchedule(params, { now });
  if (rows.length > 0) {
    await tx.rentScheduleEntry.createMany({
      data: rows.map((r) => ({
        tenancyId,
        dueDate: r.dueDate,
        expectedPence: r.expectedPence,
        status: r.status,
      })),
      skipDuplicates: true,
    });
  }

  return firstFutureDueDate(params, now);
}
