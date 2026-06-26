import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CurrencyValue } from "@/components/shared/currency-value";
import { formatPenceCompact } from "@/lib/format";

export interface TaxYearRow {
  label: string;
  incomePence: number;
  expensePence: number;
  profitPence: number;
}

/**
 * Income or Expenses analysis across recent tax years, drawn as CSS/Progress
 * bars normalised against the largest year (no charting library needed).
 */
export function TaxYearAnalysis({
  title,
  rows,
  metric,
}: {
  title: string;
  rows: TaxYearRow[];
  metric: "income" | "expense";
}) {
  const value = (r: TaxYearRow) =>
    metric === "income" ? r.incomePence : r.expensePence;
  const max = Math.max(1, ...rows.map(value));
  const tone = metric === "income" ? "success" : "danger";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{r.label}</span>
              <CurrencyValue
                pence={value(r)}
                tone={metric === "income" ? "income" : "expense"}
                className="tabular-nums font-semibold"
              />
            </div>
            <Progress value={(value(r) / max) * 100} tone={tone} />
          </div>
        ))}
        <p className="border-t border-border pt-2 text-xs text-muted-foreground">
          Latest tax year {metric}:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatPenceCompact(value(rows[0] ?? { incomePence: 0, expensePence: 0, profitPence: 0, label: "" }))}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
