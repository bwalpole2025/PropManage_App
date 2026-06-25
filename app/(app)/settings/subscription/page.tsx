import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { SubscriptionForm } from "./subscription-form";

export default async function SubscriptionSettingsPage() {
  const ctx = await getActiveContext();
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: ctx.entityId },
    select: { subscriptionStatus: true, trialEndsAt: true },
  });

  return (
    <SubscriptionForm
      status={account.subscriptionStatus}
      trialEndsAt={account.trialEndsAt ? account.trialEndsAt.toISOString() : null}
      canEdit={can(ctx.role, Capability.MANAGE_BILLING)}
    />
  );
}
