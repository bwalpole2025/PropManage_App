"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { poundsToPence } from "@/lib/format";
import {
  ComplianceType,
  DepositScheme,
  PropertyType,
  RentFrequency,
  TenancyStatus,
} from "@/lib/enums";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import {
  propertyCreateSchema,
  type PropertyCreateInput,
} from "@/schemas/property";

/**
 * Shared create logic — called by BOTH the server action below and the tRPC
 * `properties.create` mutation. Pure persistence; no redirect/revalidate so the
 * tRPC client can invalidate its own cache.
 */
export async function createPropertyCore(
  entityId: string,
  input: PropertyCreateInput,
) {
  return prisma.property.create({
    data: {
      landlordEntityId: entityId,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 || null,
      city: input.city,
      postcode: input.postcode,
      propertyType: input.propertyType ?? PropertyType.FLAT,
      bedrooms: input.bedrooms ?? null,
    },
  });
}

export async function createPropertyAction(formData: FormData) {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

  const parsed = propertyCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid property");
  }
  const property = await createPropertyCore(entityId, parsed.data);

  revalidatePath("/properties");
  revalidatePath("/dashboard");
  redirect(`/properties/${property.id}`);
}

const tenancySchema = z.object({
  propertyId: z.string().min(1),
  rent: z.string().min(1),
  rentFrequency: z.string(),
  rentDueDay: z.string().optional(),
  startDate: z.string().min(1),
  tenantName: z.string().min(1, "Tenant name is required"),
  tenantEmail: z.string().optional(),
  depositScheme: z.string().optional(),
});

export async function createTenancyAction(formData: FormData) {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

  const parsed = tenancySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid tenancy");
  }
  const d = parsed.data;

  // Verify the property belongs to the active entity.
  const property = await prisma.property.findFirst({
    where: { id: d.propertyId, landlordEntityId: entityId },
  });
  if (!property) throw new Error("Property not found");

  await prisma.tenancy.create({
    data: {
      propertyId: d.propertyId,
      status: TenancyStatus.ACTIVE,
      startDate: new Date(d.startDate),
      rentPence: poundsToPence(d.rent),
      rentFrequency: (d.rentFrequency as RentFrequency) ?? RentFrequency.MONTHLY,
      rentDueDay: d.rentDueDay ? Number.parseInt(d.rentDueDay, 10) : null,
      depositScheme: (d.depositScheme as DepositScheme) || null,
      tenants: {
        create: {
          name: d.tenantName,
          email: d.tenantEmail || null,
          isLeadTenant: true,
        },
      },
    },
  });

  revalidatePath(`/properties/${d.propertyId}`);
  revalidatePath("/dashboard");
}

const complianceSchema = z.object({
  propertyId: z.string().min(1),
  type: z.string(),
  expiryDate: z.string().min(1),
  reference: z.string().optional(),
});

export async function addComplianceDocAction(formData: FormData) {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_FILES);

  const parsed = complianceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid certificate");
  }
  const d = parsed.data;
  const property = await prisma.property.findFirst({
    where: { id: d.propertyId, landlordEntityId: entityId },
  });
  if (!property) throw new Error("Property not found");

  const offsets = [30, 14, 7, 1];
  const expiry = new Date(d.expiryDate);
  await prisma.complianceDocument.create({
    data: {
      landlordEntityId: entityId,
      propertyId: d.propertyId,
      type: (d.type as ComplianceType) ?? ComplianceType.OTHER,
      expiryDate: expiry,
      reference: d.reference || null,
      reminderOffsetsDays: offsets,
      reminders: {
        create: offsets.map((o) => ({
          offsetDays: o,
          fireOn: new Date(expiry.getTime() - o * 86400000),
        })),
      },
    },
  });

  revalidatePath(`/properties/${d.propertyId}`);
  revalidatePath("/files");
  revalidatePath("/dashboard");
}
