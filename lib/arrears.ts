import { RentStatus } from "@/lib/enums";

// Pure rent-arrears detection. The scheduled job (computeArrears) and any UI that
// needs to reason about a single rent period both go through this one function,
// so "is this period in arrears, by how much, for how long" has a single source
// of truth that is unit-testable without a database.

export const DAY_MS = 86_400_000;

export interface ArrearsInput {
  expectedPence: number;
  receivedPence: number;
  dueDate: Date;
}

export interface ArrearsAssessment {
  /** Past its due date AND not fully paid. */
  overdue: boolean;
  /** received >= expected. */
  fullyPaid: boolean;
  /** Outstanding amount when overdue (0 otherwise). */
  shortfallPence: number;
  /** Whole days since the due date when overdue (0 otherwise). */
  daysOverdue: number;
  /**
   * The status implied for an OVERDUE period: PARTIAL if something was paid,
   * OVERDUE if nothing was. PAID when fully paid, DUE when not yet due.
   */
  status: RentStatus;
}

/** Assess one rent-schedule period against the clock. */
export function evaluateArrears(
  entry: ArrearsInput,
  now: Date,
): ArrearsAssessment {
  const fullyPaid = entry.receivedPence >= entry.expectedPence;
  const overdue = entry.dueDate < now && !fullyPaid;

  if (!overdue) {
    return {
      overdue: false,
      fullyPaid,
      shortfallPence: 0,
      daysOverdue: 0,
      status: fullyPaid ? RentStatus.PAID : RentStatus.DUE,
    };
  }

  return {
    overdue: true,
    fullyPaid: false,
    shortfallPence: entry.expectedPence - entry.receivedPence,
    daysOverdue: Math.floor((now.getTime() - entry.dueDate.getTime()) / DAY_MS),
    status: entry.receivedPence > 0 ? RentStatus.PARTIAL : RentStatus.OVERDUE,
  };
}
