"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";

export interface CreateCompanyState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  companyNumber: z.string().optional(),
  utr: z.string().optional(),
  vatRegistered: z.enum(["true", "false"]).default("false"),
});

/** Create a limited company (the structure behind business portfolios). */
export async function createCompanyAction(
  _prev: CreateCompanyState,
  formData: FormData,
): Promise<CreateCompanyState> {
  const { entityId } = await getActiveContext();
  await requireEntityAccess(entityId, Capability.MANAGE_PROPERTIES);

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid company" };
  }
  const d = parsed.data;

  try {
    await prisma.company.create({
      data: {
        accountId: entityId,
        name: d.name,
        companyNumber: d.companyNumber || null,
        utr: d.utr || null,
        vatRegistered: d.vatRegistered === "true",
      },
    });
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath("/ownership");
  return { ok: true };
}
