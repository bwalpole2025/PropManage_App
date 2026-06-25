"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import type { NotificationPreferences } from "@/lib/notifications";
import { organizationSchema, notificationPrefsSchema } from "@/schemas/settings";

export interface AccountFormState {
  error?: string;
  success?: string;
}

const OWNER_ONLY = "Only the account owner can change this.";

export async function updateOrganizationAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const ctx = await getActiveContext();
  if (!can(ctx.role, Capability.MANAGE_BILLING)) return { error: OWNER_ONLY };

  const parsed = organizationSchema.safeParse({
    displayName: formData.get("displayName"),
    timeZone: formData.get("timeZone"),
    firstTaxYear: formData.get("firstTaxYear"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  await prisma.account.update({
    where: { id: ctx.entityId },
    data: parsed.data,
  });
  revalidatePath("/", "layout"); // displayName shows in the account switcher
  revalidatePath("/settings/organization");
  return { success: "Organisation updated." };
}

/** Mock subscription activation — flips trialing → active and clears the trial date. */
export async function activateSubscriptionAction(): Promise<AccountFormState> {
  const ctx = await getActiveContext();
  if (!can(ctx.role, Capability.MANAGE_BILLING)) return { error: OWNER_ONLY };

  await prisma.account.update({
    where: { id: ctx.entityId },
    data: { subscriptionStatus: "active", trialEndsAt: null },
  });
  revalidatePath("/", "layout"); // hides the TrialBanner
  revalidatePath("/settings/subscription");
  return { success: "Subscription activated — thank you!" };
}

export async function updateNotificationPrefsAction(input: {
  marketingOptIn: boolean;
  prefs: NotificationPreferences;
}): Promise<AccountFormState> {
  const ctx = await getActiveContext();
  if (!can(ctx.role, Capability.MANAGE_BILLING)) return { error: OWNER_ONLY };

  const parsed = notificationPrefsSchema.safeParse(input);
  if (!parsed.success) return { error: "Could not save preferences." };

  await prisma.account.update({
    where: { id: ctx.entityId },
    data: {
      marketingOptIn: parsed.data.marketingOptIn,
      notificationPrefs: parsed.data.prefs,
    },
  });
  revalidatePath("/settings/notifications");
  return { success: "Preferences saved." };
}
