"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Paperclip, Pencil, Sparkles, StickyNote } from "lucide-react";
import {
  bulkExcludeSelectedAction,
  bulkUnlinkSelectedAction,
  updateTransactionAction,
} from "@/actions/transaction";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { CurrencyValue } from "@/components/shared/currency-value";
import { allCategoryLabel } from "@/lib/categories";
import { TxnStatus } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BulkRecategoriseDialog } from "./bulk-recategorise-dialog";
import { CategorySelect } from "./category-select";
import { TransactionEditDialog, type EditTxn } from "./transaction-edit-dialog";

export interface TxnRow {
  id: string;
  date: Date | string;
  description: string;
  merchant: string | null;
  direction: string;
  amountPence: number;
  category: string | null;
  subcategory: string | null;
  notes: string | null;
  status: string;
  propertyId: string | null;
  tenancyId: string | null;
  attachmentFileId: string | null;
  property: {
    id: string;
    addressLine1: string;
    portfolio: { name: string } | null;
  } | null;
  tenancy: { id: string; tenants: { name: string }[] } | null;
}

export interface RowSuggestion {
  category: string;
  subcategory?: string;
  propertyId?: string;
  tenancyId?: string;
  reason: string;
}

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "neutral" }> = {
  RECONCILED: { label: "Reconciled", tone: "success" },
  UNRECONCILED: { label: "Unreconciled", tone: "warning" },
  EXCLUDED: { label: "Deactivated", tone: "neutral" },
};

export function TransactionsTable({
  rows,
  canManage,
  canManageFiles,
  properties,
  tenancies,
  suggestions,
  defaultPortfolioName,
}: {
  rows: TxnRow[];
  canManage: boolean;
  canManageFiles: boolean;
  properties: { id: string; addressLine1: string }[];
  tenancies: { id: string; label: string }[];
  suggestions: Record<string, RowSuggestion>;
  defaultPortfolioName: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<EditTxn | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [pending, start] = useTransition();

  // Drop selected ids that are no longer in the table (after a refresh/filter).
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(rows.map((r) => r.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;
  const selectedIds = useMemo(() => [...selected], [selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function clearSelection() {
    setSelected(new Set());
  }

  function runBulk(fn: () => Promise<unknown>) {
    start(async () => {
      await fn();
      clearSelection();
      router.refresh();
    });
  }

  function applySuggestion(row: TxnRow) {
    const s = suggestions[row.id];
    if (!s) return;
    start(async () => {
      await updateTransactionAction(row.id, {
        category: s.category,
        subcategory: s.subcategory ?? null,
        ...(s.propertyId ? { propertyId: s.propertyId } : {}),
        ...(s.tenancyId ? { tenancyId: s.tenancyId } : {}),
      });
      router.refresh();
    });
  }

  return (
    <>
      {canManage && selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setBulkOpen(true)}>
              Recategorise
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => runBulk(() => bulkUnlinkSelectedAction(selectedIds))}
            >
              Unlink
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => runBulk(() => bulkExcludeSelectedAction(selectedIds))}
            >
              Deactivate
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                {canManage ? (
                  <TH className="w-8">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TH>
                ) : null}
                <TH>Date</TH>
                <TH>Description</TH>
                <TH>Property / tenant</TH>
                <TH>Category</TH>
                <TH className="text-right">Amount</TH>
                <TH>Status</TH>
                {canManage ? <TH className="w-8" /> : null}
              </TR>
            </THead>
            <TBody>
              {rows.map((t) => {
                const status = STATUS[t.status] ?? { label: t.status, tone: "neutral" as const };
                const lead = t.tenancy?.tenants[0]?.name;
                const isExcluded = t.status === TxnStatus.EXCLUDED;
                const suggestion = !t.category && !isExcluded ? suggestions[t.id] : undefined;
                const portfolioName = t.property?.portfolio?.name ?? defaultPortfolioName;
                return (
                  <TR
                    key={t.id}
                    className={cn(t.status === TxnStatus.EXCLUDED && "opacity-55")}
                  >
                    {canManage ? (
                      <TD>
                        <Checkbox
                          checked={selected.has(t.id)}
                          onCheckedChange={() => toggle(t.id)}
                          aria-label={`Select ${t.description}`}
                        />
                      </TD>
                    ) : null}
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {formatDate(t.date)}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{t.description}</span>
                        {t.attachmentFileId ? (
                          <a
                            href={`/api/files/${t.attachmentFileId}`}
                            target="_blank"
                            rel="noopener"
                            title="View receipt"
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                        {t.notes ? (
                          <span title={t.notes} className="text-muted-foreground">
                            <StickyNote className="h-3.5 w-3.5" />
                          </span>
                        ) : null}
                      </div>
                      {t.merchant ? (
                        <p className="text-xs text-muted-foreground">{t.merchant}</p>
                      ) : null}
                    </TD>
                    <TD>
                      {t.property ? (
                        <Link
                          href={`/properties/${t.property.id}`}
                          className="text-sm hover:text-primary hover:underline"
                        >
                          {t.property.addressLine1}
                          {lead ? (
                            <span className="block text-xs text-muted-foreground">
                              {lead}
                            </span>
                          ) : null}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {portfolioName}
                        </span>
                      )}
                    </TD>
                    <TD>
                      {canManage && !isExcluded ? (
                        <CategorySelect
                          transactionId={t.id}
                          current={t.category}
                          currentSubcategory={t.subcategory}
                        />
                      ) : (
                        <Badge tone={t.category ? "neutral" : "warning"}>
                          {t.category ? allCategoryLabel[t.category as keyof typeof allCategoryLabel] ?? t.category : "Uncategorised"}
                        </Badge>
                      )}
                      {canManage && suggestion ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => applySuggestion(t)}
                          title={suggestion.reason}
                          className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent hover:bg-accent/20 disabled:opacity-50"
                        >
                          <Sparkles className="h-3 w-3" />
                          {allCategoryLabel[suggestion.category as keyof typeof allCategoryLabel] ?? suggestion.category}
                          <span className="font-medium">· Apply</span>
                        </button>
                      ) : null}
                    </TD>
                    <TD className="text-right">
                      <CurrencyValue
                        pence={t.direction === "EXPENSE" ? -t.amountPence : t.amountPence}
                        tone="auto"
                        signed
                        className="font-semibold"
                      />
                    </TD>
                    <TD>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </TD>
                    {canManage ? (
                      <TD>
                        <button
                          type="button"
                          aria-label="Edit transaction"
                          title="Edit"
                          onClick={() =>
                            setEditing({
                              id: t.id,
                              description: t.description,
                              category: t.category,
                              subcategory: t.subcategory,
                              propertyId: t.propertyId,
                              tenancyId: t.tenancyId,
                              notes: t.notes,
                              status: t.status,
                              attachmentFileId: t.attachmentFileId,
                            })
                          }
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </TD>
                    ) : null}
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {bulkOpen ? (
        <BulkRecategoriseDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          ids={selectedIds}
          onDone={clearSelection}
        />
      ) : null}

      {editing ? (
        <TransactionEditDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          txn={editing}
          properties={properties}
          tenancies={tenancies}
          canManageFiles={canManageFiles}
        />
      ) : null}
    </>
  );
}
