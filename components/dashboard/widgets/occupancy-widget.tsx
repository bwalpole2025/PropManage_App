import Link from "next/link";
import { KeyRound, Building2 } from "lucide-react";
import { WidgetCard } from "../widget-card";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Progress } from "@/components/ui/progress";
import type { OverviewData } from "@/services/overview";

export function OccupancyWidget({
  occupancy,
  className,
}: {
  occupancy: OverviewData["occupancy"];
  className?: string;
}) {
  return (
    <WidgetCard href="/properties" linkLabel="View properties" className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Occupancy</CardTitle>
          <CardDescription>
            Across {occupancy.availableCount} available units
          </CardDescription>
        </div>
        <KeyRound className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="space-y-4">
        {occupancy.totalProperties === 0 ? (
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="No properties yet"
            description="Occupancy appears once you add properties and tenancies."
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
              <div className="mb-1 flex items-end justify-between">
                <span className="text-2xl font-semibold tabular-nums text-primary">
                  {occupancy.occupancyPct}%
                </span>
                <span className="text-xs text-muted-foreground">occupied</span>
              </div>
              <Progress value={occupancy.occupancyPct} tone="success" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Count label="Available" value={occupancy.availableCount} />
              <Count label="Occupied" value={occupancy.occupiedCount} />
              <Count label="Vacant" value={occupancy.vacantCount} />
              <Count label="FHL" value={occupancy.fhlCount} />
            </div>
            <Link
              href="/properties"
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              Add tenancy →
            </Link>
          </>
        )}
      </CardContent>
    </WidgetCard>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-2 text-center">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
