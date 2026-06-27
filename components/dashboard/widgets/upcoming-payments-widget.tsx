import { CalendarClock } from "lucide-react";
import { WidgetCard } from "../widget-card";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateOrdinal, formatPence } from "@/lib/format";
import type { OverviewData } from "@/services/overview";

export function UpcomingPaymentsWidget({
  upcoming,
  className,
}: {
  upcoming: OverviewData["upcoming"];
  className?: string;
}) {
  return (
    <WidgetCard href="/tenancies" linkLabel="View tenancies" className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Upcoming Payments</CardTitle>
          <CardDescription>Next rent due per tenancy</CardDescription>
        </div>
        <CalendarClock className="h-5 w-5 text-accent" />
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-5 w-5" />}
            title="No upcoming payments"
            description="Next rent dates appear here once you add a tenancy."
          />
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.map((u) => (
              <li
                key={u.tenancyId}
                className="flex items-center justify-between gap-2 py-3"
              >
                <p className="min-w-0 truncate text-sm">
                  <span className="font-medium">{u.tenantName}</span>
                  <span className="text-muted-foreground">
                    {" — "}
                    {formatDateOrdinal(u.dueDate)}
                    {" — "}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatPence(u.expectedPence)}
                  </span>
                </p>
                <span className="shrink-0 text-xs text-muted-foreground truncate max-w-[40%]">
                  {u.propertyLabel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </WidgetCard>
  );
}
