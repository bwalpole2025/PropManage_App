import Link from "next/link";
import { Plus, Landmark, ArrowLeftRight } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { listTransactions } from "@/services/transactions";
import { can, Capability } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCoachmark } from "@/components/shared/section-coachmark";
import { StatTile } from "@/components/shared/stat-tile";
import { EmptyState } from "@/components/shared/empty-state";
import { CurrencyValue } from "@/components/shared/currency-value";
import { FilterBar } from "@/components/transactions/filter-bar";
import { CategorySelect } from "@/components/transactions/category-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate, formatPenceCompact } from "@/lib/format";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getActiveContext();
  const canManage = can(ctx.role, Capability.MANAGE_TRANSACTIONS);

  const { transactions, properties, totals } = await listTransactions(
    ctx.entityId,
    {
      propertyId: sp.propertyId,
      direction: sp.direction,
      uncategorisedOnly: sp.uncategorised === "1",
    },
  );

  return (
    <div className="space-y-6">
      <SectionCoachmark section="transactions" />
      <PageHeader
        title="Transactions"
        description="Categorise rent and expenses to SA105 boxes — the basis for your tax estimate."
        actions={
          <div className="flex gap-2">
            <Link href="/transactions/reconcile">
              <Button variant="outline">
                <Landmark className="h-4 w-4" /> Reconcile bank feed
              </Button>
            </Link>
            {canManage ? (
              <Link href="/transactions/new">
                <Button>
                  <Plus className="h-4 w-4" /> Add transaction
                </Button>
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Income (filtered)"
          value={formatPenceCompact(totals.incomePence)}
          accent="success"
        />
        <StatTile
          label="Expenses (filtered)"
          value={formatPenceCompact(totals.expensePence)}
        />
        <StatTile
          label="Uncategorised"
          value={totals.uncategorised}
          accent={totals.uncategorised > 0 ? "warning" : "success"}
          hint="Categorise these for an accurate tax estimate"
        />
      </div>

      <FilterBar properties={properties} />

      {transactions.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="h-5 w-5" />}
          title="No transactions match"
          description="Adjust the filters, add a manual transaction, or reconcile the bank feed."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Description</TH>
                  <TH>Property</TH>
                  <TH>Category (SA105)</TH>
                  <TH className="text-right">Amount</TH>
                </TR>
              </THead>
              <TBody>
                {transactions.map((t) => (
                  <TR key={t.id}>
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {formatDate(t.date)}
                    </TD>
                    <TD>
                      <p className="font-medium">{t.description}</p>
                      {t.merchant ? (
                        <p className="text-xs text-muted-foreground">
                          {t.merchant}
                        </p>
                      ) : null}
                    </TD>
                    <TD className="text-muted-foreground">
                      {t.property?.addressLine1 ?? "—"}
                    </TD>
                    <TD>
                      {canManage ? (
                        <CategorySelect
                          transactionId={t.id}
                          current={t.category}
                        />
                      ) : (
                        <Badge tone={t.category ? "neutral" : "warning"}>
                          {t.category ?? "Uncategorised"}
                        </Badge>
                      )}
                    </TD>
                    <TD className="text-right">
                      <CurrencyValue
                        pence={
                          t.direction === "EXPENSE" ? -t.amountPence : t.amountPence
                        }
                        tone="auto"
                        signed
                        className="font-semibold"
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
