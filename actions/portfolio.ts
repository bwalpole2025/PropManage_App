"use server";
import { toClientError } from "@/lib/errors";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PortfolioType } from "@/lib/enums";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";

export interface AddPortfolioState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z
    .enum([PortfolioType.PERSONAL, PortfolioType.BUSINESS])
    .default(PortfolioType.PERSONAL),
});

/** Create a portfolio for the active account (never the default — one per account). */
export async function createPortfolioAction(
  _prev: AddPortfolioState,
  formData: FormData,
): Promise<AddPortfolioState> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid portfolio" };
  }
  try {
    await prisma.portfolio.create({
      data: {
        accountId: entityId,
        name: parsed.data.name,
        type: parsed.data.type,
        isDefault: false,
      },
    });
  } catch (e) {
    return { error: toClientError(e) };
  }
  revalidatePath("/properties");
  return { ok: true };
}
