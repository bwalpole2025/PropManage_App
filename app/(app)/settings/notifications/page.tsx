import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { parseNotificationPrefs } from "@/lib/notifications";
import { NotificationsForm } from "./notifications-form";

export default async function NotificationsSettingsPage() {
  const ctx = await getActiveContext();
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: ctx.entityId },
    select: {
      marketingOptIn: true,
      notificationPrefs: true,
    },
  });

  return (
    <NotificationsForm
      initialMarketingOptIn={account.marketingOptIn}
      initialPrefs={parseNotificationPrefs(account.notificationPrefs)}
      canEdit={can(ctx.role, Capability.MANAGE_BILLING)}
    />
  );
}
