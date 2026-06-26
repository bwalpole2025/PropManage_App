"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  getActiveContext,
  ACTIVE_ENTITY_COOKIE,
} from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";

export interface PrivacyState {
  error?: string;
  success?: string;
}

const OWNER_ONLY = "Only the account owner can do this.";

/** Toggle the account's marketing-email consent (separate from operational prefs). */
export async function setMarketingOptInAction(
  optIn: boolean,
): Promise<PrivacyState> {
  const ctx = await getActiveContext();
  if (!can(ctx.role, Capability.MANAGE_BILLING)) return { error: OWNER_ONLY };
  await prisma.account.update({
    where: { id: ctx.entityId },
    data: { marketingOptIn: optIn },
  });
  revalidatePath("/settings/privacy");
  return {
    success: optIn
      ? "You're opted in to product & marketing emails."
      : "You're opted out of marketing emails.",
  };
}

/**
 * GDPR right-to-erasure: permanently delete this account and every row that
 * cascades from it (properties, tenancies, transactions, documents metadata,
 * bank connections, tax statements, audit logs…). Irreversible. OWNER-only and
 * guarded by an exact account-name confirmation. The user's login is left intact
 * (it may belong to other accounts); deleting the account removes all of THIS
 * account's personal & financial data.
 */
export async function deleteAccountDataAction(
  _prev: PrivacyState,
  formData: FormData,
): Promise<PrivacyState> {
  const ctx = await getActiveContext();
  if (!can(ctx.role, Capability.DELETE_ENTITY)) return { error: OWNER_ONLY };

  const confirm = String(formData.get("confirmName") ?? "").trim();
  const account = await prisma.account.findUnique({
    where: { id: ctx.entityId },
    select: { displayName: true },
  });
  if (!account) return { error: "Account not found." };
  if (confirm !== account.displayName) {
    return {
      error: `Type the account name exactly — "${account.displayName}" — to confirm.`,
    };
  }

  // The account's own AuditLog rows cascade away with it, so also emit the
  // erasure to the server log as an out-of-band, tamper-evident record.
  console.warn(
    `[gdpr] erasure: account ${ctx.entityId} ("${account.displayName}") deleted by user ${ctx.user.id}`,
  );

  await prisma.account.delete({ where: { id: ctx.entityId } });

  const store = await cookies();
  store.delete(ACTIVE_ENTITY_COOKIE);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
