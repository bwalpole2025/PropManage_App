import Link from "next/link";
import { Percent } from "lucide-react";
import { WidgetCard } from "../widget-card";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatBpPercent } from "@/lib/finance";
import type { OverviewData } from "@/services/overview";

export function RentalYieldsWidget({
  yields,
  className,
}: {
  yields: OverviewData["yields"];
  className?: string;
}) {
  const hasData =
    yields.portfolioYieldBp !== null ||
    yields.perProperty.some((p) => p.yieldBp !== null);

  return (
    <WidgetCard className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Rental Yields</CardTitle>
          <CardDescription>Gross yield on current value</CardDescription>
        </div>
        <Percent className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasData ? (
          <EmptyState
            icon={<Percent className="h-5 w-5" />}
            title="No valuations yet"
            description="Add a property valuation to calculate gross yields."
            action={
              <Link
                href="/properties"
                className="text-sm font-medium text-primary hover:underline"
              >
                View properties →
              </Link>
            }
          />
        ) : (
          <>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Portfolio yield
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">
                {formatBpPercent(yields.portfolioYieldBp)}
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              {yields.perProperty.map((p) => (
                <li
                  key={p.propertyId}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-muted-foreground">{p.label}</span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatBpPercent(p.yieldBp)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </WidgetCard>
  );
}
