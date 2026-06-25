import { CalendarClock } from "lucide-react";
import { WidgetCard } from "../widget-card";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, relativeDays, formatPence } from "@/lib/format";
import type { OverviewData } from "@/services/overview";

export function UpcomingPaymentsWidget({
  upcoming,
  className,
}: {
  upcoming: OverviewData["upcoming"];
  className?: string;
}) {
  return (
    <WidgetCard className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Upcoming Payments</CardTitle>
          <CardDescription>Rent due next</CardDescription>
        </div>
        <CalendarClock className="h-5 w-5 text-accent" />
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-5 w-5" />}
            title="No upcoming payments"
            description="Scheduled rent will appear here as due dates approach."
          />
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.map((u) => (
              <li
                key={u.tenancyId + u.dueDate.toISOString()}
                className="flex items-center justify-between py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.propertyLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.tenantName} · {formatDate(u.dueDate)} ({relativeDays(u.dueDate)})
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatPence(u.expectedPence)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </WidgetCard>
  );
}
