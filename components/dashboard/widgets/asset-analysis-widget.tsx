import Link from "next/link";
import { Gauge, Building2 } from "lucide-react";
import { WidgetCard } from "../widget-card";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Progress } from "@/components/ui/progress";
import { formatPenceCompact } from "@/lib/format";
import { formatBpPercent } from "@/lib/finance";
import type { OverviewData } from "@/services/overview";

export function AssetAnalysisWidget({
  asset,
  className,
}: {
  asset: OverviewData["asset"];
  className?: string;
}) {
  return (
    <WidgetCard className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Asset Analysis</CardTitle>
          <CardDescription>Leverage &amp; data coverage</CardDescription>
        </div>
        <Gauge className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="space-y-4">
        {asset.totalProperties === 0 ? (
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="No properties yet"
            description="Add a property to see portfolio value and leverage."
            action={
              <Link
                href="/properties/new"
                className="text-sm font-medium text-primary hover:underline"
              >
                Add a property →
              </Link>
            }
          />
        ) : (
          <>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Loan-to-value (portfolio)
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">
                {formatBpPercent(asset.ltvBp)}
              </p>
            </div>

            <ul className="space-y-2.5 text-sm">
              <Row
                label="Property valuation"
                total={asset.valuationTotalPence}
                count={asset.valuationCount}
                of={asset.totalProperties}
              />
              <Row
                label="Purchase price"
                total={asset.purchasePriceTotalPence}
                count={asset.purchasePriceCount}
                of={asset.totalProperties}
              />
              <Row
                label="Mortgage balance"
                total={asset.mortgageBalanceTotalPence}
                count={asset.mortgageCount}
                of={asset.totalProperties}
              />
            </ul>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>% of portfolio data</span>
                <span className="tabular-nums">{asset.portfolioDataPct}%</span>
              </div>
              <Progress value={asset.portfolioDataPct} />
            </div>
          </>
        )}
      </CardContent>
    </WidgetCard>
  );
}

function Row({
  label,
  total,
  count,
  of,
}: {
  label: string;
  total: number;
  count: number;
  of: number;
}) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className="font-semibold tabular-nums">
          {formatPenceCompact(total)}
        </span>
        <span className="ml-2 text-xs text-muted-foreground tabular-nums">
          {count}/{of} properties
        </span>
      </span>
    </li>
  );
}
