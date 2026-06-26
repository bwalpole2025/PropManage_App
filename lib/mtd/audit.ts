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
 * Refuse a duplicate filing: throws if an ACCEPTED submission of the same type
 * already exists for the (periodKey | taxYear). Prevents double-filing on retry
 * or double-click — submitting twice to HMRC is irreversible.
 */
export async function assertNotAlreadyAccepted(input: {
  mtdConnectionId: string;
  type: string;
  periodKey?: string | null;
  taxYearLabel: string;
}): Promise<void> {
  const existing = await prisma.mtdSubmission.findFirst({
    where: {
      mtdConnectionId: input.mtdConnectionId,
      type: input.type,
      status: SubmissionStatus.ACCEPTED,
      ...(input.periodKey
        ? { periodKey: input.periodKey }
        : { taxYearLabel: input.taxYearLabel }),
    },
    select: { id: true, hmrcReceiptId: true },
  });
  if (existing) {
    throw new Error(
      `Already submitted to HMRC (receipt ${existing.hmrcReceiptId ?? existing.id}). ` +
        `It cannot be submitted again.`,
    );
  }
}

/** Write the PENDING audit row before calling HMRC. */
export async function recordPendingSubmission(
  input: PendingSubmissionInput,
): Promise<string> {
  const row = await prisma.mtdSubmission.create({
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
