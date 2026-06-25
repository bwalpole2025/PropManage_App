import { BarChart3 } from "lucide-react";
import { WidgetCard } from "../widget-card";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatPenceCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OverviewData } from "@/services/overview";

export function ProfitLossWidget({
  pnl,
  className,
}: {
  pnl: OverviewData["pnl"];
  className?: string;
}) {
  return (
    <WidgetCard locked={!pnl.hasTransactions} className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Profit &amp; Loss</CardTitle>
          <CardDescription>Last 12 months</CardDescription>
        </div>
        <BarChart3 className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <Figure
            label="Profit"
            value={formatPenceCompact(pnl.profitPence)}
            className={pnl.profitPence >= 0 ? "text-primary" : "text-danger"}
          />
          <Figure
            label="Income"
            value={formatPenceCompact(pnl.incomePence)}
            className="text-success"
          />
          <Figure
            label="Expenses"
            value={formatPenceCompact(pnl.expensesPence)}
          />
        </div>
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
