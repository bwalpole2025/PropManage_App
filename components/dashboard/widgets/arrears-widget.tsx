import { AlertTriangle, ShieldCheck } from "lucide-react";
import { WidgetCard } from "../widget-card";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { CurrencyValue } from "@/components/shared/currency-value";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { OverviewData } from "@/services/overview";

export function ArrearsWidget({
  arrears,
  className,
}: {
  arrears: OverviewData["arrears"];
  className?: string;
}) {
  return (
    <WidgetCard className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Missing rent &amp; arrears</CardTitle>
          <CardDescription>Expected rent that hasn&apos;t fully arrived.</CardDescription>
        </div>
        <AlertTriangle className="h-5 w-5 text-warning-foreground" />
      </CardHeader>
      <CardContent>
        {arrears.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-5 w-5" />}
            title="No arrears"
            description="Every active tenancy is up to date."
          />
        ) : (
          <ul className="divide-y divide-border">
            {arrears.map((a) => (
              <li
                key={a.tenancyId + a.dueDate.toISOString()}
                className="flex items-center justify-between py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.propertyLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.tenantName} · due {formatDate(a.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={a.status === "OVERDUE" ? "danger" : "warning"}>
                    {a.status}
                  </Badge>
                  <CurrencyValue
                    pence={a.shortfallPence}
                    tone="expense"
                    className="text-sm font-semibold"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </WidgetCard>
  );
}
