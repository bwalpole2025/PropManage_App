// Write-path compliance guards. These throw `ComplianceError` (a user-correctable
// rule violation) which the calling server action surfaces as a friendly message.

import { prisma, type PrismaTx } from "@/lib/db";
import { TenancyAgreementType } from "@/lib/enums";
import {
  DAY_MS,
  RENT_INCREASE_MIN_INTERVAL_DAYS,
  RENT_INCREASE_MIN_NOTICE_DAYS,
  maxRentInAdvancePence,
} from "@/lib/compliance/rules";
import {
  evictionGroundStatus,
  type ProtectedEvictionGround,
} from "@/lib/compliance/complianceUtils";

/** A user-correctable compliance rule violation (distinct from a bug/500). */
export class ComplianceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComplianceError";
  }
}

/**
 * RRA 2025: fixed terms are abolished — new tenancies must be assured periodic.
 * Rejects a fixed end date or a non-periodic agreement type at creation. Legacy
 * pre-RRA tenancies may only be *imported* as LEGACY_FIXED, never created.
 */
export function assertAssuredPeriodic(input: {
  agreementType?: string | null;
  endDate?: Date | string | null;
}): void {
  if (
    input.agreementType &&
    input.agreementType !== TenancyAgreementType.ASSURED_PERIODIC
  ) {
    throw new ComplianceError(
      "Fixed-term tenancies were abolished by the Renters' Rights Act 2025. New tenancies must be assured periodic.",
    );
  }
  const end =
    input.endDate instanceof Date
      ? input.endDate
      : input.endDate
        ? new Date(input.endDate)
        : null;
  if (end) {
    throw new ComplianceError(
      "An assured periodic tenancy cannot have a fixed end date — leave it blank. The tenancy continues until ended by notice.",
    );
  }
}

/**
 * RRA 2025: rent may rise at most once per 12 months, via a Section 13 notice
 * giving ≥ 2 months' notice. Throws if the notice is too short, or if an increase
 * already took effect within the 12 months ending at the proposed effective date.
 * Pass the active `tx` when called inside a transaction.
 */
export async function assertRentIncreaseAllowed(
  tenancyId: string,
  noticeServedDate: Date,
  effectiveDate: Date,
  db: PrismaTx | typeof prisma = prisma,
): Promise<void> {
  if (
    effectiveDate.getTime() - noticeServedDate.getTime() <
    RENT_INCREASE_MIN_NOTICE_DAYS * DAY_MS
  ) {
    throw new ComplianceError(
      "A Section 13 notice must give at least two months' notice before the new rent takes effect.",
    );
  }
  const windowStart = new Date(
    effectiveDate.getTime() - RENT_INCREASE_MIN_INTERVAL_DAYS * DAY_MS,
  );
  const recent = await db.rentIncreaseNotice.findFirst({
    where: {
      tenancyId,
      status: { not: "WITHDRAWN" },
      effectiveDate: { gt: windowStart, lte: effectiveDate },
    },
    orderBy: { effectiveDate: "desc" },
    select: { effectiveDate: true },
  });
  if (recent) {
    throw new ComplianceError(
      `Rent can only be increased once every 12 months. The last increase took effect on ${recent.effectiveDate
        .toISOString()
        .slice(0, 10)}.`,
    );
  }
}

/**
 * RRA 2025: possession on Ground 1 (landlord/family moving in) and Ground 1A
 * (landlord selling) cannot be sought in the first 12 months of a tenancy.
 * Throws if a notice on one of these grounds would be served inside that
 * protected period. `noticeDate` defaults to now.
 */
export function assertEvictionGroundAllowed(
  tenancyStartDate: Date,
  ground: ProtectedEvictionGround,
  noticeDate: Date = new Date(),
): void {
  const status = evictionGroundStatus(
    { tenancyStartDate, ground, noticeDate },
    noticeDate,
  );
  if (!status.allowed) {
    throw new ComplianceError(status.detail);
  }
}

/** RRA 2025: no more than one rent period may be taken in advance. */
export function assertRentInAdvanceWithinCap(
  rentInAdvancePence: number,
  perPeriodRentPence: number,
): void {
  if (rentInAdvancePence > maxRentInAdvancePence(perPeriodRentPence)) {
    throw new ComplianceError(
      "The Renters' Rights Act 2025 limits rent in advance to a single rent period. Reduce the upfront amount to one period's rent or less.",
    );
  }
}
