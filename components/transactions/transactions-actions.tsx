"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Unlink } from "lucide-react";
import { bulkUnlinkTransactionsAction } from "@/actions/bank";
import { poundsToPence } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { AddTransactionDialog } from "./add-transaction-dialog";

export function TransactionsActions({
  properties,
  canManage,
}: {
  properties: { id: string; addressLine1: string }[];
  canManage: boolean;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const [pending, start] = useTransition();
  const qs = sp.toString();
  const hasFilters = qs.length > 0;

  function bulkUnlink() {
    if (
      !confirm(
        "Unlink the bank-feed transactions in view from their bank match? They'll be marked unreconciled.",
      )
    )
      return;
    const filters = {
      propertyId: sp.get("propertyId") || undefined,
      tenancyId: sp.get("tenancyId") || undefined,
      direction: sp.get("direction") || undefined,
      category: sp.get("category") || undefined,
      minPence: sp.get("min") ? poundsToPence(sp.get("min")!) : undefined,
      maxPence: sp.get("max") ? poundsToPence(sp.get("max")!) : undefined,
    };
    start(async () => {
      await bulkUnlinkTransactionsAction(filters);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`/api/transactions/export${qs ? `?${qs}` : ""}`}
        download
        className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Download className="h-4 w-4" /> Download transactions
      </a>
      {canManage ? (
        <Button
          variant="outline"
          size="sm"
          onClick={bulkUnlink}
          disabled={pending}
        >
          <Unlink className="h-4 w-4" />
          {pending ? "Unlinking…" : "Bulk unlink"}
        </Button>
      ) : null}
      {hasFilters ? (
        <Link href="/transactions">
          <Button variant="ghost" size="sm">
            Clear filters
          </Button>
        </Link>
      ) : null}
      <div className="ml-auto">
        {canManage ? <AddTransactionDialog properties={properties} /> : null}
      </div>
    </div>
  );
}
