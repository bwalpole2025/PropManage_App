"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma, type PrismaTx } from "@/lib/db";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import { validateOwnershipTotalBp } from "@/lib/ownership";

export interface AssignOwnershipState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  beneficialOwnerId: z.string().min(1, "Choose an owner"),
  targetType: z.enum(["property", "portfolio"]),
  targetId: z.string().min(1, "Choose a target"),
  // Whole-percent input (e.g. 50 or 33.33) → basis points.
  percent: z.coerce.number().min(0.01).max(100),
});

/**
 * Assign a beneficial owner a percentage share of a property OR a whole
 * portfolio (in which case the share is applied to every property in it). The
 * write is an effective-dated upsert: the owner's active row for each property
 * is updated in place, else created. Rejects any assignment that would push a
 * property's total ownership over 100%.
 */
export async function assignOwnershipAction(
  _prev: AssignOwnershipState,
  formData: FormData,
): Promise<AssignOwnershipState> {
  try {
    const { entityId } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const d = parsed.data;
    const percentageBp = Math.round(d.percent * 100);

    // IDOR: the owner must belong to this account.
    const owner = await prisma.beneficialOwner.findFirst({
      where: { id: d.beneficialOwnerId, accountId: entityId },
      select: { id: true },
    });
    if (!owner) return { error: "Owner not found" };

    // Resolve the target property set (IDOR-checked against the account).
    let propertyIds: string[];
    if (d.targetType === "property") {
      const p = await prisma.property.findFirst({
        where: { id: d.targetId, accountId: entityId },
        select: { id: true },
      });
      if (!p) return { error: "Property not found" };
      propertyIds = [p.id];
    } else {
      const portfolio = await prisma.portfolio.findFirst({
        where: { id: d.targetId, accountId: entityId },
        select: { id: true },
      });
      if (!portfolio) return { error: "Portfolio not found" };
      const props = await prisma.property.findMany({
        where: { portfolioId: d.targetId, accountId: entityId },
        select: { id: true },
      });
      propertyIds = props.map((p) => p.id);
      if (propertyIds.length === 0) {
        return { error: "That portfolio has no properties to assign." };
      }
    }

    // Serializable + retry closes the read-validate-write race (two assigns on
    // the same property can't both read a stale total and exceed 100%); the
    // partial unique index (PropertyOwnership_active_owner) is the hard backstop
    // against duplicate active rows. P2034 = serialization failure, P2002 = a
    // create that lost the race — both heal on retry (re-read → update).
    const RETRYABLE = new Set(["P2034", "P2002", "P2028"]);
    const MAX_ATTEMPTS = 5;
    let raceError: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        await prisma.$transaction(
          async (tx: PrismaTx) => {
            for (const propertyId of propertyIds) {
              const others = await tx.propertyOwnership.findMany({
                where: {
                  propertyId,
                  effectiveTo: null,
                  beneficialOwnerId: { not: d.beneficialOwnerId },
                },
                select: { ownershipPercentageBp: true },
              });
              const othersBp = others.reduce(
                (s, o) => s + o.ownershipPercentageBp,
                0,
              );
              const v = validateOwnershipTotalBp(othersBp, percentageBp);
              if (!v.ok) throw new Error(v.error);

              const existing = await tx.propertyOwnership.findFirst({
                where: {
                  propertyId,
                  beneficialOwnerId: d.beneficialOwnerId,
                  effectiveTo: null,
                },
                select: { id: true },
              });
              if (existing) {
                await tx.propertyOwnership.update({
                  where: { id: existing.id },
                  data: { ownershipPercentageBp: percentageBp },
                });
              } else {
                await tx.propertyOwnership.create({
                  data: {
                    propertyId,
                    beneficialOwnerId: d.beneficialOwnerId,
                    ownershipPercentageBp: percentageBp,
                  },
                });
              }
            }
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        raceError = undefined;
        break;
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code && RETRYABLE.has(code)) {
          raceError = e;
          continue; // concurrent change — retry the read-validate-write
        }
        throw e; // validation (over-100%) and other errors propagate
      }
    }
    if (raceError) {
      return {
        error:
          "Couldn't update ownership because of a concurrent change — please try again.",
      };
    }

    revalidatePath("/ownership");
    revalidatePath("/tax");
    revalidatePath("/dashboard");
    revalidatePath("/properties", "layout");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
