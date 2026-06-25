import Link from "next/link";
import { Calculator } from "lucide-react";
import { WidgetCard } from "../widget-card";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { formatPenceCompact } from "@/lib/format";
import type { OverviewData } from "@/services/overview";

export function TaxEstimateWidget({
  tax,
  taxYear,
  className,
}: {
  tax: OverviewData["tax"];
  taxYear: string;
  className?: string;
}) {
  return (
    <WidgetCard className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Tax estimate</CardTitle>
          <CardDescription>SA105 basis · {taxYear}</CardDescription>
        </div>
        <Calculator className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Estimated tax</p>
          <p className="text-2xl font-semibold tabular-nums text-primary">
            {formatPenceCompact(tax.estimatedTaxPence)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            on taxable profit of {formatPenceCompact(tax.taxableProfitPence)}
          </p>
        </div>
        <DisclaimerBanner />
        <Link
          href="/tax"
          className="block text-sm font-medium text-primary hover:underline"
        >
          View full tax breakdown →
        </Link>
      </CardContent>
    </WidgetCard>
  );
}
