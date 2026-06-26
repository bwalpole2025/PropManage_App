import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { getRemindersScreen } from "@/services/reminders";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { RemindersTabs } from "@/components/reminders/reminders-tabs";
import { RemindersTable } from "@/components/reminders/reminders-table";
import { NewReminderDialog } from "@/components/reminders/new-reminder-dialog";
import { ClearCompletedButton } from "@/components/reminders/clear-completed-button";

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getActiveContext();
  const canManage = can(ctx.role, Capability.MANAGE_PROPERTIES);
  const screen = await getRemindersScreen(ctx.entityId, { tab: sp.tab });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminders"
        description="Renewals, inspections and key dates — track what's outstanding and what's done."
        actions={
          canManage ? (
            <NewReminderDialog
              properties={screen.properties}
              tenancies={screen.tenancies}
            />
          ) : undefined
        }
      />

      <div className="flex items-center justify-between gap-3">
        <RemindersTabs counts={screen.counts} />
        {screen.tab === "completed" && canManage ? (
          <ClearCompletedButton disabled={screen.counts.completed === 0} />
        ) : null}
      </div>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <RemindersTable reminders={screen.reminders} tab={screen.tab} />
        </CardContent>
      </Card>
    </div>
  );
}
