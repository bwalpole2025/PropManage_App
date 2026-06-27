"use server";
import { toClientError } from "@/lib/errors";

import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  createTenancyCore,
  type CreateTenancyInput,
} from "@/services/tenancy-write";
import { revalidateTenancy } from "@/lib/tenancy-revalidate";
import {
  parseMoneyRequired,
  parseMoneyOptional,
  parseRentDueDay,
} from "@/lib/tenancy-parse";
import { poundsToPence } from "@/lib/format";
import {
  DocumentCategory,
  DepositScheme,
  PropertyType,
  RentFrequency,
} from "@/lib/enums";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import { assertAssuredPeriodic } from "@/services/compliance/guards";
import { getDefaultPortfolio } from "@/services/shared";
import {
  cameraPositionSchema,
  propertyCreateSchema,
  propertyUpdateSchema,
  type PropertyCreateInput,
} from "@/schemas/property";

// `at` is a fresh per-success discriminator so always-mounted forms (e.g. the
// notes form) can re-fire their post-success effect on a second submit — a
// sticky `ok: true` wouldn't change between two successes.
export type PropertyActionState = { ok?: boolean; error?: string; at?: number };

/** Revalidate the property's pages + the lists that include it. */
function revalidateProperty(propertyId: string) {
  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/dashboard");
}

/**
 * Find a property by id within the account, INCLUDING archived rows (the
 * soft-delete escape hatch) — needed so restore/update can target an archived
 * property. Returns the minimal selection or null.
 */
async function findOwnedProperty(entityId: string, propertyId: string) {
  return prisma.property.findFirst({
    where: { id: propertyId, accountId: entityId, archivedAt: undefined },
    select: { id: true, currentValuePence: true },
  });
}

/**
 * Shared create logic — called by BOTH the server action below and the tRPC
 * `properties.create` mutation. Pure persistence; no redirect/revalidate so the
 * tRPC client can invalidate its own cache. Properties without an explicit
 * portfolio fall into the account's default portfolio.
 */
export async function createPropertyCore(
  entityId: string,
  input: PropertyCreateInput & { portfolioId?: string },
) {
  const portfolioId = input.portfolioId ?? (await getDefaultPortfolio(entityId)).id;
  return prisma.property.create({
    data: {
      accountId: entityId,
      portfolioId,
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
  endDate: z.string().optional(),
  tenantName: z.string().min(1, "Tenant name is required"),
  tenantEmail: z.string().optional(),
  deposit: z.string().optional(),
  depositScheme: z.string().optional(),
});

function tenancyInputFromForm(
  d: z.infer<typeof tenancySchema>,
): CreateTenancyInput {
  return {
    propertyId: d.propertyId,
    tenantName: d.tenantName,
    tenantEmail: d.tenantEmail || null,
    rentPence: parseMoneyRequired("Rent", d.rent),
    rentFrequency: (d.rentFrequency as RentFrequency) || RentFrequency.MONTHLY,
    rentDueDay: parseRentDueDay(d.rentDueDay) ?? null,
    startDate: new Date(d.startDate),
    endDate: d.endDate?.trim() ? new Date(d.endDate) : null,
    depositPence: parseMoneyOptional("Deposit", d.deposit) ?? null,
    depositScheme: (d.depositScheme as DepositScheme) || null,
  };
}

export type TenancyActionState = { ok?: boolean; error?: string; at?: number };

/** Throwing form action — kept for AddTenancyForm + property-detail callers. */
export async function createTenancyAction(formData: FormData) {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

  const parsed = tenancySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid tenancy");
  }
  const input = tenancyInputFromForm(parsed.data);
  // RRA 2025: new tenancies must be assured periodic — reject a fixed end date.
  assertAssuredPeriodic({ endDate: input.endDate });
  await createTenancyCore(entityId, input);
  revalidateTenancy(parsed.data.propertyId);
}

/** `useActionState` variant for the Tenancies-screen dialog. */
export async function createTenancyState(
  _prev: TenancyActionState,
  formData: FormData,
): Promise<TenancyActionState> {
  try {
    const { entityId } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);
    const parsed = tenancySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid tenancy" };
    }
    const input = tenancyInputFromForm(parsed.data);
    // RRA 2025: new tenancies must be assured periodic — reject a fixed end date.
    assertAssuredPeriodic({ endDate: input.endDate });
    await createTenancyCore(entityId, input);
    revalidateTenancy(parsed.data.propertyId);
    return { ok: true, at: Date.now() };
  } catch (e) {
    return { error: toClientError(e) };
  }
}

const complianceSchema = z.object({
  propertyId: z.string().min(1),
  category: z.string(),
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
    where: { id: d.propertyId, accountId: entityId },
  });
  if (!property) throw new Error("Property not found");

  const offsets = [30, 14, 7, 1];
  const expiry = new Date(d.expiryDate);
  await prisma.document.create({
    data: {
      accountId: entityId,
      propertyId: d.propertyId,
      category: (d.category as DocumentCategory) ?? DocumentCategory.OTHER,
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

// ---------------------------------------------------------------------------
// Archive / restore — soft-delete. Archiving removes the property from active
// lists but preserves its transactions/history (which are account-scoped, not
// cascade-deleted). `update` is not soft-delete-guarded, so restore works.
// ---------------------------------------------------------------------------

export async function archivePropertyAction(propertyId: string) {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

  const property = await findOwnedProperty(entityId, propertyId);
  if (!property) throw new Error("Property not found");

  await prisma.property.update({
    where: { id: propertyId },
    data: { archivedAt: new Date() },
  });

  revalidateProperty(propertyId);
  redirect("/properties");
}

export async function restorePropertyAction(propertyId: string) {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

  const property = await findOwnedProperty(entityId, propertyId);
  if (!property) throw new Error("Property not found");

  await prisma.property.update({
    where: { id: propertyId },
    data: { archivedAt: null },
  });

  revalidateProperty(propertyId);
}

// ---------------------------------------------------------------------------
// Edit information — value, purchase, rental, EPC and the (IDOR-guarded)
// portfolio. Empty form fields mean "leave unchanged". Editing the current
// value also records a Valuation so the header + history stay consistent.
// ---------------------------------------------------------------------------

const EPC_RATINGS = new Set(["A", "B", "C", "D", "E", "F", "G"]);

export async function updatePropertyAction(
  propertyId: string,
  _prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  try {
    const { entityId } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

    const property = await findOwnedProperty(entityId, propertyId);
    if (!property) return { error: "Property not found" };

    const parsed = propertyUpdateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const d = parsed.data;

    // IDOR guard: the target portfolio must belong to this account.
    if (d.portfolioId) {
      const pf = await prisma.portfolio.findFirst({
        where: { id: d.portfolioId, accountId: entityId },
        select: { id: true },
      });
      if (!pf) return { error: "Portfolio not found" };
    }

    // Blank → leave unchanged; non-numeric → reject (don't silently store 0,
    // which poundsToPence would otherwise return for NaN).
    const money = (label: string, v?: string): number | undefined => {
      if (!v || !v.trim()) return undefined;
      const cleaned = v.replace(/[£,\s]/g, "").trim();
      if (!/^\d+(\.\d+)?$/.test(cleaned)) {
        throw new Error(`${label} must be a number`);
      }
      return poundsToPence(cleaned);
    };
    const data: Prisma.PropertyUpdateInput = {};

    const currentValue = money("Current value", d.currentValue);
    if (currentValue !== undefined) {
      data.currentValuePence = currentValue;
      // Record a valuation snapshot when the figure actually changes (and is a
      // real positive figure), so the header's "latest valuation" and the
      // Valuations history agree — never a £0 snapshot.
      if (currentValue > 0 && currentValue !== property.currentValuePence) {
        data.valuations = {
          create: {
            accountId: entityId,
            amountPence: currentValue,
            date: new Date(),
            source: "MANUAL",
          },
        };
      }
    }

    const purchasePrice = money("Purchase price", d.purchasePrice);
    if (purchasePrice !== undefined) data.purchasePricePence = purchasePrice;
    if (d.purchaseDate?.trim())
      data.purchaseDate = new Date(d.purchaseDate);

    const rentalIncome = money("Headline rent", d.rentalIncome);
    if (rentalIncome !== undefined) data.rentalIncomeAmountPence = rentalIncome;
    if (d.rentalIncomeFrequency)
      data.rentalIncomeFrequency = d.rentalIncomeFrequency;

    if (d.isFHL) data.isFHL = d.isFHL === "true";
    if (d.furnished) data.furnished = d.furnished === "true";

    // EPC fields: a present-but-empty value is an explicit clear (consistent
    // across rating/score/expiry); an absent field leaves the value unchanged.
    if (d.epcRating !== undefined)
      data.epcRating = EPC_RATINGS.has(d.epcRating) ? d.epcRating : null;
    if (d.epcScore !== undefined) {
      const t = d.epcScore.trim();
      if (t === "") {
        data.epcScore = null;
      } else {
        const score = Number.parseInt(t, 10);
        if (Number.isNaN(score) || score < 1 || score > 100) {
          return { error: "EPC score must be between 1 and 100" };
        }
        data.epcScore = score;
      }
    }
    if (d.epcExpiryDate !== undefined)
      data.epcExpiryDate = d.epcExpiryDate.trim()
        ? new Date(d.epcExpiryDate)
        : null;

    if (d.portfolioId)
      data.portfolio = { connect: { id: d.portfolioId } };

    await prisma.property.update({ where: { id: propertyId }, data });

    revalidateProperty(propertyId);
    revalidatePath(`/properties/${propertyId}/mortgages`);
    revalidatePath(`/properties/${propertyId}/epc`);
    return { ok: true };
  } catch (e) {
    return { error: toClientError(e) };
  }
}

// ---------------------------------------------------------------------------
// Street-view camera position (JSON) + free-text property notes.
// ---------------------------------------------------------------------------

export async function setPropertyCameraPositionAction(
  propertyId: string,
  _prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  try {
    const { entityId } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

    const property = await findOwnedProperty(entityId, propertyId);
    if (!property) return { error: "Property not found" };

    const parsed = cameraPositionSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid position" };
    }

    await prisma.property.update({
      where: { id: propertyId },
      data: { streetViewCameraPosition: parsed.data },
    });

    revalidatePath(`/properties/${propertyId}`);
    return { ok: true };
  } catch (e) {
    return { error: toClientError(e) };
  }
}

const noteSchema = z.object({
  description: z.string().trim().min(1, "Note can't be empty").max(2000),
});

export async function createPropertyNoteAction(
  propertyId: string,
  _prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  try {
    const { entityId } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

    const property = await findOwnedProperty(entityId, propertyId);
    if (!property) return { error: "Property not found" };

    const parsed = noteSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid note" };
    }

    await prisma.note.create({
      data: {
        accountId: entityId,
        propertyId,
        description: parsed.data.description,
      },
    });

    revalidatePath(`/properties/${propertyId}`);
    // `at` is a fresh discriminator so the inline note form re-fires its
    // clear+refresh effect on a second consecutive successful submit.
    return { ok: true, at: Date.now() };
  } catch (e) {
    return { error: toClientError(e) };
  }
}
