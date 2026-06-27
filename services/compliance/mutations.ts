// Prisma-backed compliance writes. All are account-scoped (the caller passes the
// authenticated accountId; child lookups are IDOR-guarded on it). SLA deadlines
// are derived here from the pure rules so they are computed in exactly one place.

import { prisma } from "@/lib/db";
import {
  HazardEventType,
  HazardStatus,
  PetRequestStatus,
  RegistrationStatus,
  RentIncreaseStatus,
  type HazardSeverity,
} from "@/lib/enums";
import {
  computeHazardDeadlines,
  computePetDeadline,
} from "@/lib/compliance/rules";
import { assertRentIncreaseAllowed, ComplianceError } from "./guards";

// ---------------------------------------------------------------------------
// Hazards (Awaab's Law / Decent Homes)
// ---------------------------------------------------------------------------

export interface CreateHazardInput {
  accountId: string;
  propertyId: string;
  tenancyId?: string | null;
  category: string;
  severity: HazardSeverity;
  reportedDate: Date;
  reportedBy?: string | null;
  description: string;
  byUserId?: string | null;
}

export async function createHazardReport(input: CreateHazardInput) {
  // IDOR: the property must belong to this account.
  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, accountId: input.accountId },
    select: { id: true },
  });
  if (!property) throw new ComplianceError("Property not found");

  const { investigateByDate, repairStartByDate } = computeHazardDeadlines(
    input.severity,
    input.reportedDate,
  );

  return prisma.hazardReport.create({
    data: {
      accountId: input.accountId,
      propertyId: input.propertyId,
      tenancyId: input.tenancyId ?? null,
      category: input.category,
      severity: input.severity,
      reportedDate: input.reportedDate,
      reportedBy: input.reportedBy ?? null,
      description: input.description,
      investigateByDate,
      repairStartByDate,
      status: HazardStatus.REPORTED,
      events: {
        create: {
          type: HazardEventType.REPORTED,
          note: `Reported (${input.severity})`,
          byUserId: input.byUserId ?? null,
        },
      },
    },
  });
}

const HAZARD_EVENT_FOR_STATUS: Record<string, string> = {
  [HazardStatus.INVESTIGATING]: HazardEventType.INVESTIGATED,
  [HazardStatus.REPAIR_SCHEDULED]: HazardEventType.SCHEDULED,
  [HazardStatus.RESOLVED]: HazardEventType.RESOLVED,
  [HazardStatus.BREACHED]: HazardEventType.BREACH,
};

/** Transition a hazard's status, stamping the matching timeline event. */
export async function updateHazardStatus(input: {
  accountId: string;
  hazardId: string;
  status: HazardStatus;
  note?: string | null;
  byUserId?: string | null;
}) {
  const hazard = await prisma.hazardReport.findFirst({
    where: { id: input.hazardId, accountId: input.accountId },
    select: { id: true },
  });
  if (!hazard) throw new ComplianceError("Hazard report not found");

  const now = new Date();
  return prisma.hazardReport.update({
    where: { id: input.hazardId },
    data: {
      status: input.status,
      ...(input.status === HazardStatus.INVESTIGATING
        ? { investigatedAt: now }
        : {}),
      ...(input.status === HazardStatus.RESOLVED ? { resolvedAt: now } : {}),
      events: {
        create: {
          type: HAZARD_EVENT_FOR_STATUS[input.status] ?? HazardEventType.NOTE,
          note: input.note ?? null,
          byUserId: input.byUserId ?? null,
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Pet requests (RRA 2025)
// ---------------------------------------------------------------------------

export async function createPetRequest(input: {
  accountId: string;
  tenancyId: string;
  petDescription: string;
  requestedDate: Date;
}) {
  const tenancy = await prisma.tenancy.findFirst({
    where: { id: input.tenancyId, property: { accountId: input.accountId } },
    select: { id: true },
  });
  if (!tenancy) throw new ComplianceError("Tenancy not found");

  return prisma.petRequest.create({
    data: {
      accountId: input.accountId,
      tenancyId: input.tenancyId,
      petDescription: input.petDescription,
      requestedDate: input.requestedDate,
      responseDeadline: computePetDeadline(input.requestedDate, false),
      status: PetRequestStatus.PENDING,
    },
  });
}

/**
 * Record a decision on a pet request. INFO_REQUESTED extends the deadline to the
 * 42-day window; a REFUSED decision must carry a reason (refusal must be
 * reasonable under the RRA).
 */
export async function decidePetRequest(input: {
  accountId: string;
  petRequestId: string;
  status: PetRequestStatus;
  decisionReason?: string | null;
}) {
  const pet = await prisma.petRequest.findFirst({
    where: { id: input.petRequestId, accountId: input.accountId },
    select: { id: true, requestedDate: true },
  });
  if (!pet) throw new ComplianceError("Pet request not found");

  if (input.status === PetRequestStatus.REFUSED && !input.decisionReason?.trim()) {
    throw new ComplianceError(
      "A pet request can only be refused on reasonable grounds — please record the reason.",
    );
  }

  if (input.status === PetRequestStatus.INFO_REQUESTED) {
    return prisma.petRequest.update({
      where: { id: input.petRequestId },
      data: {
        status: PetRequestStatus.INFO_REQUESTED,
        responseDeadline: computePetDeadline(pet.requestedDate, true),
      },
    });
  }

  return prisma.petRequest.update({
    where: { id: input.petRequestId },
    data: {
      status: input.status,
      decisionReason: input.decisionReason?.trim() || null,
      decidedAt: new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// Section 13 rent increase
// ---------------------------------------------------------------------------

export async function serveRentIncreaseNotice(input: {
  accountId: string;
  tenancyId: string;
  noticeServedDate: Date;
  effectiveDate: Date;
  proposedRentPence: number;
}) {
  return prisma.$transaction(async (tx) => {
    const tenancy = await tx.tenancy.findFirst({
      where: { id: input.tenancyId, property: { accountId: input.accountId } },
      select: { id: true, rentPence: true },
    });
    if (!tenancy) throw new ComplianceError("Tenancy not found");

    // Enforce ≥2 months' notice and the once-per-12-months rule (within the tx).
    await assertRentIncreaseAllowed(
      input.tenancyId,
      input.noticeServedDate,
      input.effectiveDate,
      tx,
    );

    if (input.proposedRentPence <= tenancy.rentPence) {
      throw new ComplianceError(
        "The proposed rent must be higher than the current rent.",
      );
    }

    return tx.rentIncreaseNotice.create({
      data: {
        accountId: input.accountId,
        tenancyId: input.tenancyId,
        noticeServedDate: input.noticeServedDate,
        effectiveDate: input.effectiveDate,
        previousRentPence: tenancy.rentPence,
        proposedRentPence: input.proposedRentPence,
        status: RentIncreaseStatus.SERVED,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Landlord registration (PRS Ombudsman) — 1:1 with Account
// ---------------------------------------------------------------------------

export async function upsertLandlordRegistration(input: {
  accountId: string;
  ombudsmanScheme?: string | null;
  ombudsmanRef?: string | null;
  ombudsmanRenewalDate?: Date | null;
  status: RegistrationStatus;
}) {
  const data = {
    ombudsmanScheme: input.ombudsmanScheme ?? null,
    ombudsmanRef: input.ombudsmanRef ?? null,
    ombudsmanRenewalDate: input.ombudsmanRenewalDate ?? null,
    status: input.status,
  };
  return prisma.landlordRegistration.upsert({
    where: { accountId: input.accountId },
    create: { accountId: input.accountId, ...data },
    update: data,
  });
}
