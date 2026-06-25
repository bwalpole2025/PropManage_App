import { getActiveContext } from "@/lib/auth/active-org";
import { prisma } from "@/lib/db";
import { BankConnStatus } from "@/lib/enums";
import {
  listTransactions,
  parseTransactionFilters,
} from "@/services/transactions";
import { can, Capability } from "@/lib/auth/rbac";
import { suggestForRows } from "@/lib/categorisation-rules";
import { ExpiredConnectionBanner } from "@/components/transactions/expired-connection-banner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCoachmark } from "@/components/shared/section-coachmark";
import { InfoButton } from "@/components/shared/info-button";
import { StatTile } from "@/components/shared/stat-tile";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/transactions/filter-bar";
import { TransactionsActions } from "@/components/transactions/transactions-actions";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { InputChoiceCards } from "@/components/transactions/input-choice-cards";
import { ConnectBankFeedButton } from "@/components/transactions/connect-bank-feed-button";
import { ImportWizardButton } from "@/components/transactions/import-wizard";
import { formatPenceCompact } from "@/lib/format";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getActiveContext();
  const canManage = can(ctx.role, Capability.MANAGE_TRANSACTIONS);
  const canManageFiles = can(ctx.role, Capability.MANAGE_FILES);

  const {
    transactions,
    properties,
    tenancies,
    bankAccounts,
    totalCount,
    defaultPortfolioName,
    totals,
  } = await listTransactions(ctx.entityId, parseTransactionFilters(sp));

  const expiredConnections = await prisma.bankConnection.count({
    where: { accountId: ctx.entityId, status: BankConnStatus.EXPIRED },
  });

  // Tenancy pickers + the rules-engine context.
  const tenancyOptions = tenancies.map((t) => ({
    id: t.id,
    label: `${t.tenants[0]?.name ?? "Tenant"} · ${t.property.addressLine1}`,
  }));
  const suggestions = suggestForRows(
    transactions.map((t) => ({
      id: t.id,
      category: t.category,
      description: t.description,
      merchant: t.merchant,
      amountPence: t.amountPence,
      direction: t.direction,
    })),
    {
      properties,
      tenancies: tenancies.map((t) => ({
        id: t.id,
        propertyId: t.propertyId,
        leadTenantName: t.tenants[0]?.name ?? null,
      })),
    },
  );

  return (
    <div className="space-y-6">
      <SectionCoachmark section="transactions" />
      <ExpiredConnectionBanner count={expiredConnections} />
      <PageHeader
        title="Transactions"
        description="A filterable ledger of rent and expenses — categorised to SA105 boxes for tax."
        actions={
          <div className="flex items-center gap-2">
            <InfoButton section="transactions" />
            {canManage ? (
              <>
                <ImportWizardButton
                  properties={properties}
                  tenancies={tenancyOptions}
                  canManageFiles={canManageFiles}
                  label="Import file"
                  variant="secondary"
                />
                <ConnectBankFeedButton label="Add bank feed" variant="primary" />
              </>
            ) : null}
          </div>
        }
      />

      {totalCount === 0 ? (
        <InputChoiceCards
          canManage={canManage}
          canManageFiles={canManageFiles}
          properties={properties}
          tenancies={tenancyOptions}
        />
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

          <TransactionsActions
            properties={properties}
            tenancies={tenancyOptions}
            canManage={canManage}
          />

          {transactions.length === 0 ? (
            <EmptyState
              icon={<span className="text-2xl">🕵️</span>}
              title="Nothing to show"
              description="No transactions match these filters."
            />
          ) : (
            <TransactionsTable
              rows={transactions}
              canManage={canManage}
              canManageFiles={canManageFiles}
              properties={properties}
              tenancies={tenancyOptions}
              suggestions={suggestions}
              defaultPortfolioName={defaultPortfolioName}
            />
          )}
        </>
      )}
    </div>
  );
}
