// Submission audit chokepoint. EVERY submission to HMRC (quarterly update, EOPS,
// final declaration) flows through here so each attempt is logged identically:
// a PENDING row is written BEFORE the external call (fail-closed — we never call
// HMRC without a record), then transitioned to ACCEPTED with the receipt or
// REJECTED with the error. Prior receipts are never overwritten.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SubmissionStatus } from "@/lib/enums";

export interface PendingSubmissionInput {
  mtdConnectionId: string;
  obligationId?: string | null;
  type: string; // SubmissionType incl. "EOPS"
  periodKey?: string | null;
  taxYearLabel: string;
  payload: Prisma.InputJsonValue;
  submittedByUserId: string;
  submittedByMembershipId: string;
}

/**
 * Write the PENDING audit row before calling HMRC — atomically refusing a
 * duplicate. A Postgres advisory xact-lock keyed on (connection, type, period)
 * serialises concurrent submits, and the in-transaction check rejects when an
 * ACTIVE (PENDING or ACCEPTED) submission already exists. This closes the
 * check-then-act race that two tabs / a double-click / accountant+owner could
 * otherwise use to double-file the irreversible filing. A REJECTED row does not
 * block, so a failed attempt can be retried.
 */
export async function recordPendingSubmission(
  input: PendingSubmissionInput,
): Promise<string> {
  const lockKey = `mtd:${input.mtdConnectionId}:${input.type}:${input.periodKey ?? input.taxYearLabel}`;
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`;
    const active = await tx.mtdSubmission.findFirst({
      where: {
        mtdConnectionId: input.mtdConnectionId,
        type: input.type,
        status: { in: [SubmissionStatus.PENDING, SubmissionStatus.ACCEPTED] },
        ...(input.periodKey
          ? { periodKey: input.periodKey }
          : { periodKey: null, taxYearLabel: input.taxYearLabel }),
      },
      select: { id: true, status: true, hmrcReceiptId: true },
    });
    if (active) {
      throw new Error(
        active.status === SubmissionStatus.ACCEPTED
          ? `Already submitted to HMRC (receipt ${active.hmrcReceiptId ?? active.id}). It cannot be submitted again.`
          : "A submission for this period is already in progress.",
      );
    }
    const row = await tx.mtdSubmission.create({
      data: {
        mtdConnectionId: input.mtdConnectionId,
        obligationId: input.obligationId ?? null,
        type: input.type,
        periodKey: input.periodKey ?? null,
        taxYearLabel: input.taxYearLabel,
        payload: input.payload,
        status: SubmissionStatus.PENDING,
        submittedByUserId: input.submittedByUserId,
        submittedByMembershipId: input.submittedByMembershipId,
      },
      select: { id: true },
    });
    return row.id;
  });
}

/** Transition a PENDING row to ACCEPTED with the HMRC receipt. */
export async function finalizeSubmission(
  id: string,
  result: {
    hmrcReceiptId: string;
    receiptJson?: Prisma.InputJsonValue;
    calculationId?: string | null;
    status?: string;
  },
): Promise<void> {
  await prisma.mtdSubmission.update({
    where: { id },
    data: {
      status: result.status ?? SubmissionStatus.ACCEPTED,
      hmrcReceiptId: result.hmrcReceiptId,
      receiptJson: result.receiptJson,
      calculationId: result.calculationId ?? null,
      submittedAt: new Date(),
    },
  });
}

/** Transition a PENDING row to REJECTED, preserving the HMRC error for display. */
export async function recordError(
  id: string,
  errorJson: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.mtdSubmission.update({
    where: { id },
    data: { status: SubmissionStatus.REJECTED, errorJson },
  });
}
