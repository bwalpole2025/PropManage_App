import { getActiveContext } from "@/lib/auth/active-org";
import { listForUser } from "@/lib/notifications/service";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationsList } from "@/components/notifications/notifications-list";

export default async function NotificationsPage() {
  const { entityId, user } = await getActiveContext();
  const rows = await listForUser(entityId, user.id, { limit: 50 });
  const items = rows.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    href: n.href,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Incoming payments and rent alerts."
      />
      <NotificationsList items={items} />
    </div>
  );
}
