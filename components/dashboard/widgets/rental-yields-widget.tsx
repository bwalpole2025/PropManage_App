import { Percent } from "lucide-react";
import { WidgetCard } from "../widget-card";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBpPercent } from "@/lib/finance";
import type { OverviewData } from "@/services/overview";

// Scale a yield (bp) onto a 0–100 bar, treating ~12% as a full bar.
function yieldBar(yieldBp: number | null): number {
  if (yieldBp == null) return 0;
  return Math.min(100, (yieldBp / 100 / 12) * 100);
}

export function RentalYieldsWidget({
  yields,
  className,
}: {
  yields: OverviewData["yields"];
  className?: string;
}) {
  const lockCta =
    yields.lockReason === "no-purchase"
      ? { label: "Add purchase prices", href: "/properties" }
      : { label: "Track a transaction", href: "/transactions/new" };

  return (
    <WidgetCard
      href="/properties"
      linkLabel="View properties"
      locked={yields.locked}
      lockCta={lockCta}
      className={className}
    >
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Rental Yields</CardTitle>
          <CardDescription>
            Gross yield on purchase price · {yields.taxYearLabel}
          </CardDescription>
        </div>
        <Percent className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Portfolio yield
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">
            {formatBpPercent(yields.portfolioYieldBp)}
          </p>
        </div>
        <ul className="space-y-2.5 text-sm">
          {yields.perProperty.map((p) => (
            <li key={p.propertyId} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-muted-foreground">{p.label}</span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatBpPercent(p.yieldBp)}
                </span>
              </div>
              <Progress value={yieldBar(p.yieldBp)} tone="accent" />
            </li>
          ))}
        </ul>
      </CardContent>
    </WidgetCard>
  );
}
