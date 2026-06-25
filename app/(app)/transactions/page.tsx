import Link from "next/link";
import { getActiveContext } from "@/lib/auth/active-org";
import {
  listTransactions,
  parseTransactionFilters,
} from "@/services/transactions";
import { can, Capability } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCoachmark } from "@/components/shared/section-coachmark";
import { InfoButton } from "@/components/shared/info-button";
import { StatTile } from "@/components/shared/stat-tile";
import { EmptyState } from "@/components/shared/empty-state";
import { CurrencyValue } from "@/components/shared/currency-value";
import { FilterBar } from "@/components/transactions/filter-bar";
import { CategorySelect } from "@/components/transactions/category-select";
import { TransactionsActions } from "@/components/transactions/transactions-actions";
import { InputChoiceCards } from "@/components/transactions/input-choice-cards";
import { ConnectBankFeedButton } from "@/components/transactions/connect-bank-feed-button";
import { ImportTransactionsButton } from "@/components/transactions/import-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate, formatPenceCompact } from "@/lib/format";

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "neutral" }> = {
  RECONCILED: { label: "Reconciled", tone: "success" },
  UNRECONCILED: { label: "Unreconciled", tone: "warning" },
  EXCLUDED: { label: "Excluded", tone: "neutral" },
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getActiveContext();
  const canManage = can(ctx.role, Capability.MANAGE_TRANSACTIONS);

  const { transactions, properties, tenancies, bankAccounts, totalCount, totals } =
    await listTransactions(ctx.entityId, parseTransactionFilters(sp));

  return (
    <div className="space-y-6">
      <SectionCoachmark section="transactions" />
      <PageHeader
        title="Transactions"
        description="A filterable ledger of rent and expenses — categorised to SA105 boxes for tax."
        actions={
          <div className="flex items-center gap-2">
            <InfoButton section="transactions" />
            {canManage ? (
              <>
                <ImportTransactionsButton label="Import file" variant="secondary" />
                <ConnectBankFeedButton label="Add bank feed" variant="primary" />
              </>
            ) : null}
          </div>
        }
      />

      {totalCount === 0 ? (
        <InputChoiceCards canManage={canManage} />
      ) : (
        <>
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

          <FilterBar
            properties={properties}
            tenancies={tenancies}
            bankAccounts={bankAccounts}
          />

          <TransactionsActions properties={properties} canManage={canManage} />

          {transactions.length === 0 ? (
            <EmptyState
              icon={<span className="text-2xl">🕵️</span>}
              title="Nothing to show"
              description="No transactions match these filters."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>Date</TH>
                      <TH>Description</TH>
                      <TH>Property / tenant</TH>
                      <TH>Category (SA105)</TH>
                      <TH className="text-right">Amount</TH>
                      <TH>Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {transactions.map((t) => {
                      const status = STATUS[t.status] ?? {
                        label: t.status,
                        tone: "neutral" as const,
                      };
                      return (
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
                          <TD>
                            {t.property ? (
                              <Link
                                href={`/properties/${t.property.id}`}
                                className="text-sm hover:text-primary hover:underline"
                              >
                                {t.property.addressLine1}
                                {t.tenancy?.tenants[0]?.name ? (
                                  <span className="block text-xs text-muted-foreground">
                                    {t.tenancy.tenants[0].name}
                                  </span>
                                ) : null}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
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
                                t.direction === "EXPENSE"
                                  ? -t.amountPence
                                  : t.amountPence
                              }
                              tone="auto"
                              signed
                              className="font-semibold"
                            />
                          </TD>
                          <TD>
                            {t.status === "UNRECONCILED" ? (
                              <Link href="/transactions/reconcile">
                                <Badge tone="warning">{status.label}</Badge>
                              </Link>
                            ) : (
                              <Badge tone={status.tone}>{status.label}</Badge>
                            )}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
