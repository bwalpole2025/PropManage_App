"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveContext, requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import { createTaxStatements } from "@/services/tax-statements";
import { taxAckCookieName } from "@/lib/tax-ack";
import type { TaxBand } from "@/lib/tax";

export type TaxActionState = { ok?: boolean; error?: string; at?: number };

/**
 * Record the two acknowledgements (not tax advice; figures depend on correct
 * categorisation). Sets a per-account cookie the server page checks before it
 * fetches or renders any figures.
 */
export async function acceptTaxDisclaimerAction(
  _prev: TaxActionState,
  formData: FormData,
): Promise<TaxActionState> {
  try {
    const { entityId } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.VIEW);

    if (!formData.get("ackNotAdvice") || !formData.get("ackCategorisation")) {
      return { error: "Please confirm both acknowledgements to continue." };
    }

    const store = await cookies();
    store.set(taxAckCookieName(entityId), "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    revalidatePath("/tax");
    return { ok: true, at: Date.now() };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const createSchema = z.object({
  taxYear: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Choose a tax year")
    // The end-year suffix must be (startYear + 1) mod 100, e.g. 2026-27.
    .refine(
      (l) => Number(l.slice(5)) === (Number(l.slice(0, 4)) + 1) % 100,
      "Invalid tax year",
    ),
  band: z.enum(["BASIC", "HIGHER", "ADDITIONAL"]).optional(),
  allowance: z.enum(["0", "1"]).optional(),
});

/** Generate (regenerate) the tax statement for a tax year. */
export async function createTaxStatementAction(
  _prev: TaxActionState,
  formData: FormData,
): Promise<TaxActionState> {
  try {
    const { entityId } = await getActiveContext();
    await requireEntityAccess(entityId, Capability.RUN_TAX);

    const parsed = createSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    await createTaxStatements(entityId, parsed.data.taxYear, {
      taxBand: parsed.data.band as TaxBand | undefined,
      usePropertyAllowance: parsed.data.allowance === "1",
    });

    revalidatePath("/tax");
    return { ok: true, at: Date.now() };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
