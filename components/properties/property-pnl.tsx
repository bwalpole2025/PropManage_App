import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { WidgetCard } from "@/components/dashboard/widget-card";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatPenceCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PnlResult } from "@/lib/portfolio";

/** Profit & Loss for a single property over the last 12 months (+ this tax year). */
export function PropertyPnl({
  pnl,
  taxYearLabel,
  hasTransactions,
  propertyId,
}: {
  pnl: PnlResult;
  taxYearLabel: string;
  hasTransactions: boolean;
  propertyId: string;
}) {
  return (
    <WidgetCard
      locked={!hasTransactions}
      lockCta={{
        label: "Track a transaction",
        href: `/properties/${propertyId}/transactions`,
      }}
    >
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Profit &amp; Loss analysis</CardTitle>
          <CardDescription>Last 12 months</CardDescription>
        </div>
        <BarChart3 className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        {!hasTransactions ? (
          <EmptyState
            icon={<BarChart3 className="h-5 w-5" />}
            title="No financial data yet"
            description="Track income and expenses for this property to see its profit & loss."
            action={
              <Link
                href={`/properties/${propertyId}/transactions`}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Add a transaction →
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Figure
                label="Profit"
                value={formatPenceCompact(pnl.last12m.profitPence)}
                className={
                  pnl.last12m.profitPence >= 0 ? "text-primary" : "text-danger"
                }
              />
              <Figure
                label="Income"
                value={formatPenceCompact(pnl.last12m.incomePence)}
                className="text-success"
              />
              <Figure
                label="Expenses"
                value={formatPenceCompact(pnl.last12m.expensesPence)}
              />
            </div>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              This tax year ({taxYearLabel}):{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatPenceCompact(pnl.taxYear.profitPence)}
              </span>{" "}
              profit
            </p>
          </>
        )}
      </CardContent>
    </WidgetCard>
  );
}

function Figure({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums", className)}>
        {value}
      </p>
    </div>
  );
}
