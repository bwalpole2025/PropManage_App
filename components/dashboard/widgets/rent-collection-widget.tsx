import { Banknote } from "lucide-react";
import { WidgetCard } from "../widget-card";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatPenceCompact } from "@/lib/format";
import type { OverviewData } from "@/services/overview";

export function RentCollectionWidget({
  data,
  locked,
  className,
}: {
  data: OverviewData["rentCollection"];
  locked: boolean;
  className?: string;
}) {
  const tone =
    data.collectedPct >= 90 ? "success" : data.collectedPct >= 60 ? "warning" : "danger";
  return (
    <WidgetCard locked={locked} className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Rent Collection</CardTitle>
          <CardDescription>Collected vs expected (12 months)</CardDescription>
        </div>
        <Banknote className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <span className="text-2xl font-semibold tabular-nums text-primary">
            {data.collectedPct}%
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatPenceCompact(data.receivedPence)} of{" "}
            {formatPenceCompact(data.expectedPence)}
          </span>
        </div>
        <Progress value={data.collectedPct} tone={tone} />
      </CardContent>
    </WidgetCard>
  );
}
