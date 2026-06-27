"use server";
import { toClientError } from "@/lib/errors";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { services } from "@/lib/services";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import { recordAudit } from "@/lib/audit";
import { poundsToPence } from "@/lib/format";
import { assertValidUpload, normalizeMime } from "@/lib/uploads";
import {
  COMPLIANCE_CATEGORIES,
  DocumentCategory,
} from "@/lib/enums";
import {
  createHazardReport,
  updateHazardStatus,
  createPetRequest,
  decidePetRequest,
  serveRentIncreaseNotice,
  upsertLandlordRegistration,
} from "@/services/compliance/mutations";
import { ComplianceError } from "@/services/compliance/guards";
import {
  hazardCreateSchema,
  hazardStatusSchema,
  petCreateSchema,
  petDecideSchema,
  rentIncreaseSchema,
  registrationSchema,
  prsdUpdateSchema,
  rightToRentSchema,
} from "@/schemas/compliance";

export type ComplianceActionState = {
  ok?: boolean;
  error?: string;
  at?: number;
};

const ok = (): ComplianceActionState => ({ ok: true, at: Date.now() });

/** Parse a form date; returns null for an absent/blank optional value. */
function toDate(value: string | undefined, label: string): Date | null {
  if (value === undefined || value.trim() === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ComplianceError(`Invalid ${label}`);
  return d;
}

/** Map thrown errors to a friendly state (ComplianceError messages pass through). */
function fail(e: unknown): ComplianceActionState {
  return { error: toClientError(e) };
}

function revalidateCompliance() {
  revalidatePath("/compliance");
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Hazards
// ---------------------------------------------------------------------------

export async function reportHazardAction(
  _prev: ComplianceActionState,
  formData: FormData,
): Promise<ComplianceActionState> {
  try {
    const { entityId, user } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);
    const parsed = hazardCreateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    const d = parsed.data;

    const hazard = await createHazardReport({
      accountId: entityId,
      propertyId: d.propertyId,
      tenancyId: d.tenancyId || null,
      category: d.category,
      severity: d.severity,
      reportedDate: toDate(d.reportedDate, "report date")!,
      reportedBy: d.reportedBy || null,
      description: d.description,
      byUserId: user.id,
    });
    await recordAudit({
      accountId: entityId,
      actorUserId: user.id,
      action: "compliance.hazard_reported",
      targetType: "HazardReport",
      targetId: hazard.id,
      metadata: { category: d.category, severity: d.severity },
    });
    revalidatePath("/compliance/hazards");
    revalidateCompliance();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function updateHazardStatusAction(
  _prev: ComplianceActionState,
  formData: FormData,
): Promise<ComplianceActionState> {
  try {
    const { entityId, user } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);
    const parsed = hazardStatusSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    const d = parsed.data;

    await updateHazardStatus({
      accountId: entityId,
      hazardId: d.hazardId,
      status: d.status,
      note: d.note || null,
      byUserId: user.id,
    });
    await recordAudit({
      accountId: entityId,
      actorUserId: user.id,
      action: "compliance.hazard_updated",
      targetType: "HazardReport",
      targetId: d.hazardId,
      metadata: { status: d.status },
    });
    revalidatePath("/compliance/hazards");
    revalidateCompliance();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Pet requests
// ---------------------------------------------------------------------------

export async function createPetRequestAction(
  _prev: ComplianceActionState,
  formData: FormData,
): Promise<ComplianceActionState> {
  try {
    const { entityId, user } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);
    const parsed = petCreateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    const d = parsed.data;

    const pet = await createPetRequest({
      accountId: entityId,
      tenancyId: d.tenancyId,
      petDescription: d.petDescription,
      requestedDate: toDate(d.requestedDate, "request date")!,
    });
    await recordAudit({
      accountId: entityId,
      actorUserId: user.id,
      action: "compliance.pet_requested",
      targetType: "PetRequest",
      targetId: pet.id,
    });
    revalidatePath("/compliance/pets");
    revalidateCompliance();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function decidePetRequestAction(
  _prev: ComplianceActionState,
  formData: FormData,
): Promise<ComplianceActionState> {
  try {
    const { entityId, user } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);
    const parsed = petDecideSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    const d = parsed.data;

    await decidePetRequest({
      accountId: entityId,
      petRequestId: d.petRequestId,
      status: d.status,
      decisionReason: d.decisionReason || null,
    });
    await recordAudit({
      accountId: entityId,
      actorUserId: user.id,
      action: "compliance.pet_decided",
      targetType: "PetRequest",
      targetId: d.petRequestId,
      metadata: { status: d.status },
    });
    revalidatePath("/compliance/pets");
    revalidateCompliance();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Section 13 rent increase
// ---------------------------------------------------------------------------

export async function serveRentIncreaseAction(
  _prev: ComplianceActionState,
  formData: FormData,
): Promise<ComplianceActionState> {
  try {
    const { entityId, user } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);
    const parsed = rentIncreaseSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    const d = parsed.data;

    const proposedRentPence = poundsToPence(d.proposedRent);
    if (proposedRentPence <= 0) {
      return { error: "Enter a valid proposed rent" };
    }

    const notice = await serveRentIncreaseNotice({
      accountId: entityId,
      tenancyId: d.tenancyId,
      noticeServedDate: toDate(d.noticeServedDate, "notice date")!,
      effectiveDate: toDate(d.effectiveDate, "effective date")!,
      proposedRentPence,
    });
    await recordAudit({
      accountId: entityId,
      actorUserId: user.id,
      action: "compliance.rent_increase_served",
      targetType: "RentIncreaseNotice",
      targetId: notice.id,
      metadata: { proposedRentPence },
    });
    revalidatePath("/compliance");
    revalidatePath("/tenancies");
    return ok();
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Registrations + property/tenant compliance fields
// ---------------------------------------------------------------------------

export async function saveLandlordRegistrationAction(
  _prev: ComplianceActionState,
  formData: FormData,
): Promise<ComplianceActionState> {
  try {
    const { entityId, user } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);
    const parsed = registrationSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    const d = parsed.data;

    await upsertLandlordRegistration({
      accountId: entityId,
      ombudsmanScheme: d.ombudsmanScheme || null,
      ombudsmanRef: d.ombudsmanRef || null,
      ombudsmanRenewalDate: toDate(d.ombudsmanRenewalDate, "renewal date"),
      status: d.status,
    });
    await recordAudit({
      accountId: entityId,
      actorUserId: user.id,
      action: "compliance.registration_saved",
      targetType: "LandlordRegistration",
      targetId: entityId,
      metadata: { status: d.status },
    });
    revalidatePath("/compliance/registrations");
    revalidateCompliance();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function savePrsdAction(
  _prev: ComplianceActionState,
  formData: FormData,
): Promise<ComplianceActionState> {
  try {
    const { entityId, user } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);
    const parsed = prsdUpdateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    const d = parsed.data;

    // IDOR: only update a property in this account.
    const updated = await prisma.property.updateMany({
      where: { id: d.propertyId, accountId: entityId },
      data: {
        prsdId: d.prsdId || null,
        prsdStatus: d.prsdStatus,
        prsdRegisteredDate: toDate(d.prsdRegisteredDate, "registration date"),
      },
    });
    if (updated.count === 0) return { error: "Property not found" };
    await recordAudit({
      accountId: entityId,
      actorUserId: user.id,
      action: "compliance.prsd_saved",
      targetType: "Property",
      targetId: d.propertyId,
      metadata: { status: d.prsdStatus },
    });
    revalidatePath("/compliance/registrations");
    revalidateCompliance();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function saveRightToRentAction(
  _prev: ComplianceActionState,
  formData: FormData,
): Promise<ComplianceActionState> {
  try {
    const { entityId, user } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);
    const parsed = rightToRentSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    const d = parsed.data;

    // IDOR: tenant must belong to a tenancy under a property in this account.
    const updated = await prisma.tenant.updateMany({
      where: {
        id: d.tenantId,
        tenancy: { property: { accountId: entityId } },
      },
      data: {
        rightToRentStatus: d.rightToRentStatus,
        rightToRentExpiry: toDate(d.rightToRentExpiry, "expiry date"),
      },
    });
    if (updated.count === 0) return { error: "Tenant not found" };
    await recordAudit({
      accountId: entityId,
      actorUserId: user.id,
      action: "compliance.right_to_rent_saved",
      targetType: "Tenant",
      targetId: d.tenantId,
      metadata: { status: d.rightToRentStatus },
    });
    revalidateCompliance();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Certificate upload (drag & drop) — stores the renewed cert + new expiry, and
// re-materialises the 30/14/7/1-day reminders. Manual date entry (OCR later).
// ---------------------------------------------------------------------------

export async function uploadCertificateAction(
  _prev: ComplianceActionState,
  formData: FormData,
): Promise<ComplianceActionState> {
  try {
    const { entityId, user } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_FILES);

    const propertyId = String(formData.get("propertyId") || "");
    const category = String(formData.get("category") || "");
    const reference = String(formData.get("reference") || "").trim() || null;
    const expiry = toDate(String(formData.get("expiryDate") || ""), "expiry date");
    if (!propertyId || !category || !expiry) {
      return { error: "Property, certificate type and expiry date are required" };
    }
    if (!COMPLIANCE_CATEGORIES.includes(category as DocumentCategory)) {
      return { error: "Invalid certificate type" };
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, accountId: entityId },
      select: { id: true },
    });
    if (!property) return { error: "Property not found" };

    // Optionally store the uploaded file (PDF/image) and link it to the doc.
    let fileId: string | null = null;
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      assertValidUpload(file);
      const mimeType = normalizeMime(file.type);
      const bytes = Buffer.from(await file.arrayBuffer());
      const safeName = file.name.replace(/[^\w.-]+/g, "_");
      const key = `${entityId}/${randomUUID()}-${safeName}`;
      const { sizeBytes } = await services.storage.put(key, bytes, mimeType);
      const fileObj = await prisma.fileObject.create({
        data: {
          accountId: entityId,
          propertyId,
          filename: file.name,
          mimeType,
          sizeBytes,
          storageKey: key,
          uploadedByUserId: user.id,
        },
      });
      fileId = fileObj.id;
    }

    const offsets = [30, 14, 7, 1];
    await prisma.document.create({
      data: {
        accountId: entityId,
        propertyId,
        category: category as DocumentCategory,
        issuedDate: new Date(),
        expiryDate: expiry,
        reference,
        fileId,
        reminderOffsetsDays: offsets,
        reminders: {
          create: offsets.map((o) => ({
            offsetDays: o,
            fireOn: new Date(expiry.getTime() - o * 86400000),
          })),
        },
      },
    });
    await recordAudit({
      accountId: entityId,
      actorUserId: user.id,
      action: "compliance.certificate_uploaded",
      targetType: "Document",
      targetId: propertyId,
      metadata: { category, hasFile: fileId != null },
    });
    revalidatePath(`/properties/${propertyId}/compliance`);
    revalidateCompliance();
    return ok();
  } catch (e) {
    return fail(e);
  }
}
