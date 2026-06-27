import Link from "next/link";
import { Banknote } from "lucide-react";
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
import type { OverviewData } from "@/services/overview";

export function RentCollectionWidget({
  data,
  className,
}: {
  data: OverviewData["rentCollection"];
  className?: string;
}) {
  const tone =
    data.collectedPct >= 90
      ? "success"
      : data.collectedPct >= 60
        ? "warning"
        : "danger";
  return (
    <WidgetCard href="/transactions" linkLabel="View transactions" className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Rent Collection</CardTitle>
          <CardDescription>
            Collected vs expected ({data.monthLabel})
          </CardDescription>
        </div>
        <Banknote className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="space-y-3">
        {!data.hasSchedule ? (
          <EmptyState
            icon={<Banknote className="h-5 w-5" />}
            title={`No rent scheduled for ${data.monthLabel}`}
            description="Once a tenancy has a rent schedule, collection shows here."
          />
        ) : (
          <>
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
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Expected</p>
                <p className="font-semibold tabular-nums">
                  {formatPenceCompact(data.expectedPence)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="font-semibold tabular-nums">
                  {formatPenceCompact(data.receivedPence)}
                </p>
              </div>
            </div>
            <Link
              href="/transactions"
              className="block text-sm font-medium text-primary hover:underline"
            >
              Review transactions →
            </Link>
          </>
        )}
      </CardContent>
    </WidgetCard>
  );
}
