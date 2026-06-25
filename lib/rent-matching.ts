// Rent payment ↔ rent-schedule matching.
//
// Mirrors the status/alert semantics of lib/jobs/handlers/computeArrears.ts so a
// payment categorised as rent clears the corresponding arrears entry (and the
// reverse restores it). Each function takes a Prisma transaction client and must
// be called inside prisma.$transaction(...). Idempotent in both directions.

import type { PrismaTx } from "./db";
import { RentStatus, TenancyStatus } from "./enums";

const DAY = 86_400_000;

export interface RentTxnInput {
  id: string;
  amountPence: number;
  propertyId: string | null;
  tenancyId: string | null;
  rentDueDate: Date | null;
}

/**
 * The RentStatus a schedule period should hold given how much is received vs
 * expected and whether it's past due — the single source of truth shared by the
 * arrears job, match, and unmatch (pure; unit-tested).
 */
export function rentEntryStatus(
  receivedPence: number,
  expectedPence: number,
  dueDate: Date,
  now: Date,
): RentStatus {
  if (receivedPence >= expectedPence) return RentStatus.PAID;
  if (dueDate < now) {
    return receivedPence > 0 ? RentStatus.PARTIAL : RentStatus.OVERDUE;
  }
  return receivedPence > 0 ? RentStatus.PARTIAL : RentStatus.DUE;
}

export interface MatchResult {
  tenancyId: string;
  /** The cleared/updated schedule entry, or null if the tenancy had no open period. */
  entryId: string | null;
  dueDate: Date | null;
}

/**
 * Link a rent payment to its tenancy and apply it to the oldest unsettled
 * rent-schedule period (FIFO arrears clearing), preferring the entry on the
 * transaction's rentDueDate when set. Returns the resolved tenancy (so the
 * caller can write it back onto the transaction) or null if no tenancy resolves.
 */
export async function matchRentPayment(
  tx: PrismaTx,
  txn: RentTxnInput,
  now: Date = new Date(),
): Promise<MatchResult | null> {
  // Resolve the tenancy: explicit link, else the property's active tenancy.
  let tenancyId = txn.tenancyId;
  if (!tenancyId && txn.propertyId) {
    const active = await tx.tenancy.findFirst({
      where: { propertyId: txn.propertyId, status: TenancyStatus.ACTIVE },
      orderBy: { startDate: "desc" },
      select: { id: true },
    });
    tenancyId = active?.id ?? null;
  }
  if (!tenancyId) return null;

  // Target period: the one on rentDueDate, else the oldest still-owed period.
  const entry =
    (txn.rentDueDate
      ? await tx.rentScheduleEntry.findFirst({
          where: { tenancyId, dueDate: txn.rentDueDate },
        })
      : null) ??
    (await tx.rentScheduleEntry.findFirst({
      where: {
        tenancyId,
        status: {
          in: [RentStatus.DUE, RentStatus.OVERDUE, RentStatus.PARTIAL],
        },
      },
      orderBy: { dueDate: "asc" },
    }));

  // Tenancy resolved but nothing open to clear — still link the tenancy.
  if (!entry) return { tenancyId, entryId: null, dueDate: null };

  // Idempotent: already applied to this period.
  if (entry.matchedTransactionIds.includes(txn.id)) {
    return { tenancyId, entryId: entry.id, dueDate: entry.dueDate };
  }

  const received = entry.receivedPence + txn.amountPence;
  const fullyPaid = received >= entry.expectedPence;
  const status = rentEntryStatus(received, entry.expectedPence, entry.dueDate, now);

  await tx.rentScheduleEntry.update({
    where: { id: entry.id },
    data: {
      receivedPence: received,
      matchedTransactionIds: { push: txn.id },
      status,
    },
  });

  if (fullyPaid) {
    // Cleared — resolve any open arrears alert.
    await tx.arrearsAlert.updateMany({
      where: { rentScheduleEntryId: entry.id, resolvedAt: null },
      data: { resolvedAt: now },
    });
  } else if (entry.dueDate < now) {
    // Still short and past due — keep an open alert current (create if the
    // arrears job hasn't opened one yet), mirroring computeArrears.
    const shortfall = entry.expectedPence - received;
    const daysOverdue = Math.floor(
      (now.getTime() - entry.dueDate.getTime()) / DAY,
    );
    const open = await tx.arrearsAlert.findFirst({
      where: { rentScheduleEntryId: entry.id, resolvedAt: null },
    });
    if (open) {
      await tx.arrearsAlert.update({
        where: { id: open.id },
        data: { shortfallPence: shortfall, daysOverdue },
      });
    } else {
      await tx.arrearsAlert.create({
        data: {
          tenancyId: entry.tenancyId,
          rentScheduleEntryId: entry.id,
          shortfallPence: shortfall,
          daysOverdue,
        },
      });
    }
  }

  return { tenancyId, entryId: entry.id, dueDate: entry.dueDate };
}

/**
 * Reverse a previous match: subtract the payment from whichever schedule period
 * holds this transaction id, recompute its status exactly like computeArrears,
 * and reopen the arrears alert if it falls back into shortfall. Idempotent.
 */
export async function unmatchRentPayment(
  tx: PrismaTx,
  txnId: string,
  amountPence: number,
  now: Date = new Date(),
): Promise<{ entryId: string } | null> {
  const entry = await tx.rentScheduleEntry.findFirst({
    where: { matchedTransactionIds: { has: txnId } },
  });
  if (!entry) return null;

  const received = Math.max(0, entry.receivedPence - amountPence);
  const ids = entry.matchedTransactionIds.filter((i) => i !== txnId);
  const overdue = entry.dueDate < now && received < entry.expectedPence;
  const status = rentEntryStatus(received, entry.expectedPence, entry.dueDate, now);

  await tx.rentScheduleEntry.update({
    where: { id: entry.id },
    data: { receivedPence: received, matchedTransactionIds: { set: ids }, status },
  });

  if (received >= entry.expectedPence) {
    await tx.arrearsAlert.updateMany({
      where: { rentScheduleEntryId: entry.id, resolvedAt: null },
      data: { resolvedAt: now },
    });
  } else if (overdue) {
    const shortfall = entry.expectedPence - received;
    const daysOverdue = Math.floor(
      (now.getTime() - entry.dueDate.getTime()) / DAY,
    );
    // Reopen the entry's most recent alert (the one match resolved) rather than
    // leaving a resolved alert and stacking a duplicate; create only if none.
    const existing = await tx.arrearsAlert.findFirst({
      where: { rentScheduleEntryId: entry.id },
      orderBy: { firstDetectedAt: "desc" },
    });
    if (existing) {
      await tx.arrearsAlert.update({
        where: { id: existing.id },
        data: { resolvedAt: null, shortfallPence: shortfall, daysOverdue },
      });
    } else {
      await tx.arrearsAlert.create({
        data: {
          tenancyId: entry.tenancyId,
          rentScheduleEntryId: entry.id,
          shortfallPence: shortfall,
          daysOverdue,
        },
      });
    }
  }

  return { entryId: entry.id };
}
