"use client";

import { TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { StatTile } from "@/components/shared/stat-tile";
import { Card } from "@/components/ui/card";
import { formatPenceCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Client KPI tiles — server state via TanStack Query through the tRPC
 * `dashboard.summary` procedure (which wraps the same getDashboardData the
 * server page uses). Proves the typed-API + client-data-layer end to end.
 */
export function DashboardKpis() {
  const { data, isLoading } = trpc.dashboard.summary.useQuery();

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-[104px] animate-pulse p-5">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="mt-3 h-7 w-20 rounded bg-muted" />
          </Card>
        ))}
      </div>
    );
  }

  const { kpis } = data;
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4")}>
      <StatTile
        label="Rental income"
        value={formatPenceCompact(kpis.incomePence)}
        hint="This tax year to date"
        accent="success"
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <StatTile
        label="Expenses"
        value={formatPenceCompact(kpis.expensesPence)}
        hint="This tax year to date"
        accent="neutral"
        icon={<TrendingDown className="h-4 w-4" />}
      />
      <StatTile
        label="Net position"
        value={formatPenceCompact(kpis.netPence)}
        hint="Income minus expenses"
        accent={kpis.netPence >= 0 ? "primary" : "danger"}
        icon={<Wallet className="h-4 w-4" />}
      />
      <StatTile
        label="Rent arrears"
        value={formatPenceCompact(kpis.arrearsPence)}
        hint={`${data.arrears.length} period(s) outstanding`}
        accent={kpis.arrearsPence > 0 ? "danger" : "success"}
        icon={<AlertTriangle className="h-4 w-4" />}
      />
    </div>
  );
}
