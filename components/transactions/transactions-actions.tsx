"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddTransactionDialog } from "./add-transaction-dialog";

export function TransactionsActions({
  properties,
  tenancies,
  canManage,
}: {
  properties: { id: string; addressLine1: string }[];
  tenancies: { id: string; label: string }[];
  canManage: boolean;
}) {
  const sp = useSearchParams();
  const qs = sp.toString();
  const hasFilters = qs.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`/api/transactions/export${qs ? `?${qs}` : ""}`}
        download
        className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Download className="h-4 w-4" /> Download transactions
      </a>
      {hasFilters ? (
        <Link href="/transactions">
          <Button variant="ghost" size="sm">
            Clear filters
          </Button>
        </Link>
      ) : null}
      <div className="ml-auto">
        {canManage ? (
          <AddTransactionDialog properties={properties} tenancies={tenancies} />
        ) : null}
      </div>
    </div>
  );
}
