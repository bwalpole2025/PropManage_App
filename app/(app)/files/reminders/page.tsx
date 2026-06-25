import { CalendarClock } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getFilesAndDates } from "@/services/files";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, relativeDays } from "@/lib/format";
import { ImportantDateKindLabel } from "@/lib/enums";

export default async function RemindersPage() {
  const ctx = await getActiveContext();
  const { reminders } = await getFilesAndDates(ctx.entityId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminders"
        description="Renewals, rent reviews, mortgage and inspection dates — soonest first."
      />

      <Card>
        <CardContent className="pt-6">
          {reminders.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-6 w-6" />}
              title="No reminders"
              description="Key dates across your portfolio will show here as they approach."
            />
          ) : (
            <ul className="divide-y divide-border">
              {reminders.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.property?.addressLine1 ?? "Portfolio"} ·{" "}
                      {formatDate(d.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="info">
                      {ImportantDateKindLabel[
                        d.kind as keyof typeof ImportantDateKindLabel
                      ] ?? d.kind}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {relativeDays(d.dueDate)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
