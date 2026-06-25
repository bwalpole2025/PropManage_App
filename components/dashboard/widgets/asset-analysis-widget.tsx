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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Loan-to-value
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">
                  {formatBpPercent(asset.ltvBp)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Portfolio {formatBpPercent(asset.portfolioLtvBp)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Portfolio value
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatPenceCompact(asset.portfolioValuePence)}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Portfolio data completeness</span>
                <span className="tabular-nums">{asset.portfolioDataPct}%</span>
              </div>
              <Progress value={asset.portfolioDataPct} />
            </div>

            <ul className="space-y-2 text-sm">
              <Coverage label="Valuation coverage" pct={asset.valuationCoveragePct} />
              <Coverage
                label="Purchase price coverage"
                pct={asset.purchasePriceCoveragePct}
              />
              <Coverage
                label="Mortgage balance coverage"
                pct={asset.mortgageCoveragePct}
              />
            </ul>
          </>
        )}
      </CardContent>
    </WidgetCard>
  );
}

function Coverage({ label, pct }: { label: string; pct: number }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-44 shrink-0 text-muted-foreground">{label}</span>
      <Progress value={pct} tone="accent" className="flex-1" />
      <span className="w-10 shrink-0 text-right tabular-nums">{pct}%</span>
    </li>
  );
}
