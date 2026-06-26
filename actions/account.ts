"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { services } from "@/lib/services";
import {
  PLAN_INTERVAL,
  PLAN_PRICE_PENCE,
  subscriptionView,
} from "@/lib/subscription";
import { SubscriptionStatus } from "@/lib/enums";
import { formatDate, formatPence } from "@/lib/format";
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

/**
 * Activate a subscription via the payment provider's HOSTED checkout. We never
 * receive raw card data and never auto-accept terms — the caller must pass an
 * explicit `termsAccepted`. Activating during the trial keeps `trialEndsAt` so
 * the first charge is scheduled for (and communicated as) the trial-end date.
 */
export async function activateSubscriptionAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const ctx = await getActiveContext();
  if (!can(ctx.role, Capability.MANAGE_BILLING)) return { error: OWNER_ONLY };

  const terms = formData.get("termsAccepted");
  if (terms !== "on" && terms !== "true") {
    return { error: "Please accept the terms to continue." };
  }

  const account = await prisma.account.findUniqueOrThrow({
    where: { id: ctx.entityId },
    select: { trialEndsAt: true },
  });
  const trialEndsIso = account.trialEndsAt
    ? account.trialEndsAt.toISOString()
    : null;

  // Provider-hosted checkout — raw card data is collected on the provider's
  // page, never here. The mock completes immediately.
  const session = await services.payments.createCheckoutSession({
    entityId: ctx.entityId,
    pricePence: PLAN_PRICE_PENCE,
    interval: PLAN_INTERVAL,
    trialEndsAt: trialEndsIso,
    successUrl: "/settings/subscription?activated=1",
    cancelUrl: "/settings/subscription",
  });
  await services.payments.confirmCheckout({
    entityId: ctx.entityId,
    sessionId: session.sessionId,
  });

  // Activate now (unlocks premium); billing is scheduled for the trial end,
  // which we keep on `trialEndsAt` for accurate first-charge messaging.
  await prisma.account.update({
    where: { id: ctx.entityId },
    data: { subscriptionStatus: SubscriptionStatus.ACTIVE },
  });
  revalidatePath("/", "layout"); // hides the TrialBanner + premium gates
  revalidatePath("/settings/subscription");

  const view = subscriptionView({
    status: SubscriptionStatus.ACTIVE,
    trialEndsAt: trialEndsIso,
  });
  return {
    success: `Subscription active. Your first payment of ${formatPence(
      PLAN_PRICE_PENCE,
    )} will be on ${formatDate(view.firstChargeDate)}.`,
  };
}

/** Cancel the subscription with the provider and mark the account canceled. */
export async function cancelSubscriptionAction(): Promise<AccountFormState> {
  const ctx = await getActiveContext();
  if (!can(ctx.role, Capability.MANAGE_BILLING)) return { error: OWNER_ONLY };

  await services.payments.cancelSubscription({ entityId: ctx.entityId });
  await prisma.account.update({
    where: { id: ctx.entityId },
    data: { subscriptionStatus: SubscriptionStatus.CANCELED },
  });
  revalidatePath("/", "layout");
  revalidatePath("/settings/subscription");
  return { success: "Subscription canceled." };
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
