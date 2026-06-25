import Link from "next/link";
import { ShieldAlert, TrendingUp, TrendingDown } from "lucide-react";
import { WidgetCard } from "../widget-card";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatPenceCompact } from "@/lib/format";
import { formatBpPercent } from "@/lib/finance";
import { cn } from "@/lib/utils";
import type { OverviewData } from "@/services/overview";

export function MarketRiskWidget({
  risk,
  className,
}: {
  risk: OverviewData["marketRisk"];
  className?: string;
}) {
  const up = risk.gainPence >= 0;
  return (
    <WidgetCard className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Market Risk</CardTitle>
          <CardDescription>Valuation vs purchase price</CardDescription>
        </div>
        <ShieldAlert className="h-5 w-5 text-warning-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {!risk.hasData ? (
          <EmptyState
            icon={<ShieldAlert className="h-5 w-5" />}
            title="ADD FINANCIAL DATA"
            description="Add a valuation and purchase price to see capital growth."
            action={
              <Link
                href="/properties"
                className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Add financial data →
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  up ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
                )}
              >
                {up ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
              </span>
              <div>
                <p
                  className={cn(
                    "text-2xl font-semibold tabular-nums",
                    up ? "text-success" : "text-danger",
                  )}
                >
                  {up ? "+" : ""}
                  {formatPenceCompact(risk.gainPence)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBpPercent(risk.gainBp)} vs purchase price
                </p>
              </div>
            </div>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Current valuation</span>
                <span className="font-medium tabular-nums">
                  {formatPenceCompact(risk.valuationTotalPence)}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Purchase price</span>
                <span className="font-medium tabular-nums">
                  {formatPenceCompact(risk.purchasePriceTotalPence)}
                </span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              {risk.coveredCount}/{risk.totalProperties} properties with full data
            </p>
          </>
        )}
      </CardContent>
    </WidgetCard>
  );
}
