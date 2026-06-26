"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { BeneficialOwnerType } from "@/lib/enums";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";

export interface CreateOwnerState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  legalName: z.string().min(1, "Name is required"),
  type: z
    .enum([BeneficialOwnerType.INDIVIDUAL, BeneficialOwnerType.COMPANY])
    .default(BeneficialOwnerType.INDIVIDUAL),
  portfolioId: z.string().optional(),
  companyId: z.string().optional(),
});

/** Record a beneficial owner (individual or company) for the active account. */
export async function createBeneficialOwnerAction(
  _prev: CreateOwnerState,
  formData: FormData,
): Promise<CreateOwnerState> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid owner" };
  }
  const d = parsed.data;

  // IDOR guards: any linked portfolio/company must belong to this account.
  if (d.portfolioId) {
    const pf = await prisma.portfolio.findFirst({
      where: { id: d.portfolioId, accountId: entityId },
      select: { id: true },
    });
    if (!pf) return { error: "Portfolio not found" };
  }
  if (d.companyId) {
    const co = await prisma.company.findFirst({
      where: { id: d.companyId, accountId: entityId },
      select: { id: true },
    });
    if (!co) return { error: "Company not found" };
  }

  try {
    await prisma.beneficialOwner.create({
      data: {
        accountId: entityId,
        legalName: d.legalName,
        type: d.type,
        portfolioId: d.portfolioId || null,
        companyId: d.companyId || null,
      },
    });
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath("/ownership");
  revalidatePath("/tax");
  return { ok: true };
}
