import Link from "next/link";
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
  untracked,
  className,
}: {
  arrears: OverviewData["arrears"];
  untracked: OverviewData["untrackedTenancies"];
  className?: string;
}) {
  const empty = arrears.length === 0 && untracked.length === 0;
  return (
    <WidgetCard className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Missing rent &amp; arrears</CardTitle>
          <CardDescription>
            Expected rent that hasn&apos;t fully arrived.
          </CardDescription>
        </div>
        <AlertTriangle className="h-5 w-5 text-warning-foreground" />
      </CardHeader>
      <CardContent>
        {empty ? (
          <EmptyState
            icon={<ShieldCheck className="h-5 w-5" />}
            title="No arrears"
            description="Every active tenancy is up to date."
          />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {arrears.map((a) => (
                <li
                  key={a.tenancyId + a.dueDate.toISOString()}
                  className="flex items-center justify-between py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/properties/${a.propertyId}/tenancies`}
                      className="truncate text-sm font-medium hover:text-primary hover:underline"
                    >
                      {a.tenantName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.propertyLabel} · due {formatDate(a.dueDate)}
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
              {untracked.map((u) => (
                <li
                  key={u.tenancyId}
                  className="flex items-center justify-between py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/properties/${u.propertyId}/tenancies`}
                      className="truncate text-sm font-medium hover:text-primary hover:underline"
                    >
                      {u.tenantName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.propertyLabel} · rent tracking not started
                    </p>
                  </div>
                  <Badge tone="neutral">Untracked</Badge>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Tip: open a tenant to see any missing payments.
            </p>
          </>
        )}
      </CardContent>
    </WidgetCard>
  );
}
