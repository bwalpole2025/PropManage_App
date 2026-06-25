import Link from "next/link";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyValue } from "@/components/shared/currency-value";
import { formatDate, formatPence } from "@/lib/format";
import type { PropertyCardRow } from "@/services/properties-screen";
import { SubscribeLock } from "./subscribe-lock";

function Figure({
  label,
  pence,
  tone,
  signed,
}: {
  label: string;
  pence: number;
  tone: "income" | "expense" | "auto";
  signed?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <CurrencyValue pence={pence} tone={tone} signed={signed} className="text-sm font-semibold" />
    </div>
  );
}

export function PropertyCard({
  row,
  trialing,
}: {
  row: PropertyCardRow;
  trialing: boolean;
}) {
  const financials = (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      <Figure label="Income" pence={row.incomePence} tone="income" />
      <Figure label="Expenses" pence={row.expensePence} tone="expense" />
      <Figure label="Profit" pence={row.profitPence} tone="auto" signed />
      <Figure label="Arrears" pence={row.arrearsPence} tone="expense" />
    </div>
  );

  return (
    <Link href={`/properties/${row.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </span>
            <Badge tone={row.occupancyStatus === "Occupied" ? "success" : "warning"}>
              {row.occupancyStatus}
            </Badge>
          </div>

          <div>
            <h3 className="font-semibold leading-tight">{row.addressLine1}</h3>
            <p className="text-sm text-muted-foreground">
              {row.city}, {row.postcode}
            </p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {formatPence(row.monthlyRentPence, { showPence: false })} monthly
            </span>
            <span className="text-xs text-muted-foreground">{row.portfolioName}</span>
          </div>

          <div className="border-t border-border pt-3">
            <p className="mb-2 text-[11px] text-muted-foreground">
              Tax year from {formatDate(row.taxYearStart)}
            </p>
            {trialing ? <SubscribeLock>{financials}</SubscribeLock> : financials}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Arrears shown as of today.
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
