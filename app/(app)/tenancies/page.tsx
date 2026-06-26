import { KeyRound, Plus } from "lucide-react";
import Link from "next/link";
import { getActiveContext } from "@/lib/auth/active-org";
import { prisma } from "@/lib/db";
import { can, Capability } from "@/lib/auth/rbac";
import { getPropertiesScreen } from "@/services/properties-screen";
import { getTenanciesScreen } from "@/services/tenancies";
import { taxYearLabelFor, formatPence } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCoachmark } from "@/components/shared/section-coachmark";
import { EmptyState } from "@/components/shared/empty-state";
import { CurrencyValue } from "@/components/shared/currency-value";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/properties/metric-card";
import { AddPortfolioDialog } from "@/components/properties/add-portfolio-dialog";
import { SubscribeLock } from "@/components/properties/subscribe-lock";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { TenanciesFilterBar } from "@/components/tenancies/tenancies-filter-bar";
import { TenancyFormDialog } from "@/components/tenancies/tenancy-form-dialog";
import { TenancyCard } from "@/components/tenancies/tenancy-card";
import { ImportTenanciesButton } from "@/components/tenancies/tenancy-import-wizard";

export default async function TenanciesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getActiveContext();
  const canManage = can(ctx.role, Capability.MANAGE_PROPERTIES);
  const canManageTxns = can(ctx.role, Capability.MANAGE_TRANSACTIONS);

  const account = await prisma.account.findUnique({
    where: { id: ctx.entityId },
    select: { subscriptionStatus: true },
  });
  const trialing = account?.subscriptionStatus === "trialing";

  const screen = await getPropertiesScreen(ctx.entityId, {
    taxYear: taxYearLabelFor(),
  });
  const propertyOptions = screen.properties.map((p) => ({
    id: p.id,
    addressLine1: p.addressLine1,
  }));
  const importProperties = screen.properties.map((p) => ({
    id: p.id,
    addressLine1: p.addressLine1,
    postcode: p.postcode,
  }));
  const rows = await getTenanciesScreen(ctx.entityId, {
    q: sp.q,
    property: sp.property,
    status: sp.status,
    sort: sp.sort,
  });

  return (
    <div className="space-y-6">
      <SectionCoachmark section="tenancies" />
      <PageHeader
        title="Tenancies"
        description="Tenants, rent and arrears across your portfolio."
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <ImportTenanciesButton properties={importProperties} />
              <TenancyFormDialog mode="add" properties={propertyOptions} />
            </div>
          ) : null
        }
      />

      {/* Summary metric cards (shared with the Properties screen). */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Portfolios"
          value={screen.summary.portfolioCount}
          action={canManage ? <AddPortfolioDialog /> : null}
        />
        <MetricCard
          label="Properties"
          value={screen.summary.propertyCount}
          action={
            canManage ? (
              <Link href="/properties/new">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4" /> Add Property
                </Button>
              </Link>
            ) : null
          }
        />
        <MetricCard
          label="Tenancies"
          value={screen.summary.tenancyCount}
          hint={`${screen.summary.vacantCount} vacant`}
        />
        <MetricCard
          label="Credit & Arrears"
          value={
            trialing ? (
              <SubscribeLock>
                <CurrencyValue pence={screen.summary.arrearsPence} tone="expense" />
              </SubscribeLock>
            ) : (
              <CurrencyValue pence={screen.summary.arrearsPence} tone="expense" />
            )
          }
          hint={
            trialing
              ? "Arrears outstanding"
              : `${formatPence(screen.summary.creditPence)} in credit`
          }
          action={
            canManageTxns ? (
              <AddTransactionDialog
                properties={propertyOptions}
                tenancies={screen.tenancyOptions}
              />
            ) : null
          }
        />
      </div>

      <TenanciesFilterBar properties={propertyOptions} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<KeyRound className="h-5 w-5" />}
          title="No tenancies"
          description="Add a tenancy to track rent, arrears and upcoming payments — or adjust the filters."
          action={
            canManage ? (
              <TenancyFormDialog mode="add" properties={propertyOptions} />
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((row) => (
            <TenancyCard key={row.id} row={row} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  );
}
