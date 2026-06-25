import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { prisma } from "@/lib/db";
import { can, Capability } from "@/lib/auth/rbac";
import {
  getPropertiesScreen,
  listInsurance,
  listMortgages,
} from "@/services/properties-screen";
import { recentTaxYears, taxYearLabelFor, formatPence } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCoachmark } from "@/components/shared/section-coachmark";
import { EmptyState } from "@/components/shared/empty-state";
import { CurrencyValue } from "@/components/shared/currency-value";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/properties/metric-card";
import { PropertiesTabs } from "@/components/properties/properties-tabs";
import { PropertiesFilterBar } from "@/components/properties/properties-filter-bar";
import { PropertyCard } from "@/components/properties/property-card";
import { InsuranceTable } from "@/components/properties/insurance-table";
import { MortgagesTable } from "@/components/properties/mortgages-table";
import { AddPortfolioDialog } from "@/components/properties/add-portfolio-dialog";
import { ImportPropertiesButton } from "@/components/properties/property-import-wizard";
import { SubscribeLock } from "@/components/properties/subscribe-lock";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const tab = sp.tab ?? "properties";
  const ctx = await getActiveContext();
  const canManage = can(ctx.role, Capability.MANAGE_PROPERTIES);
  const canManageTxns = can(ctx.role, Capability.MANAGE_TRANSACTIONS);

  const account = await prisma.account.findUnique({
    where: { id: ctx.entityId },
    select: { subscriptionStatus: true },
  });
  const trialing = account?.subscriptionStatus === "trialing";

  const taxYears = recentTaxYears(5);
  // Validate the URL param before it reaches taxYearStartDate (NaN → bad query).
  const taxYear =
    sp.taxYear && /^\d{4}-\d{2}$/.test(sp.taxYear)
      ? sp.taxYear
      : taxYearLabelFor();
  const data = await getPropertiesScreen(ctx.entityId, {
    portfolioId: sp.portfolio,
    taxYear,
    sort: sp.sort,
  });

  return (
    <div className="space-y-6">
      <SectionCoachmark section="properties" />
      <PageHeader
        title="Properties"
        description="Your portfolio at a glance — income, occupancy, insurance and mortgages."
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <ImportPropertiesButton />
              <Link href="/properties/new">
                <Button>
                  <Plus className="h-4 w-4" /> Add Property
                </Button>
              </Link>
            </div>
          ) : null
        }
      />

      {/* Summary metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Portfolios"
          value={data.summary.portfolioCount}
          action={canManage ? <AddPortfolioDialog /> : null}
        />
        <MetricCard
          label="Properties"
          value={data.summary.propertyCount}
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
          value={data.summary.tenancyCount}
          hint={`${data.summary.vacantCount} vacant`}
        />
        <MetricCard
          label="Credit & Arrears"
          value={
            trialing ? (
              <SubscribeLock>
                <CurrencyValue pence={data.summary.arrearsPence} tone="expense" />
              </SubscribeLock>
            ) : (
              <CurrencyValue pence={data.summary.arrearsPence} tone="expense" />
            )
          }
          hint={
            trialing ? "Arrears outstanding" : `${formatPence(data.summary.creditPence)} in credit`
          }
          action={
            canManageTxns ? (
              <AddTransactionDialog
                properties={data.properties.map((p) => ({
                  id: p.id,
                  addressLine1: p.addressLine1,
                }))}
                tenancies={data.tenancyOptions}
              />
            ) : null
          }
        />
      </div>

      <PropertiesTabs active={tab} />
      <PropertiesFilterBar portfolios={data.portfolios} taxYears={taxYears} />

      {tab === "insurance" ? (
        <InsuranceTabContent entityId={ctx.entityId} portfolioId={sp.portfolio} />
      ) : tab === "mortgages" ? (
        <MortgagesTabContent entityId={ctx.entityId} portfolioId={sp.portfolio} />
      ) : data.properties.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title="No properties"
          description="Add your first property, or adjust the portfolio filter."
          action={
            canManage ? (
              <Link href="/properties/new">
                <Button>
                  <Plus className="h-4 w-4" /> Add Property
                </Button>
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.properties.map((row) => (
            <PropertyCard key={row.id} row={row} trialing={trialing} />
          ))}
        </div>
      )}
    </div>
  );
}

async function InsuranceTabContent({
  entityId,
  portfolioId,
}: {
  entityId: string;
  portfolioId?: string;
}) {
  const rows = await listInsurance(entityId, { portfolioId });
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<span className="text-2xl">🛡️</span>}
        title="No insurance policies"
        description="Insurance policies for your properties will appear here."
      />
    );
  }
  return <InsuranceTable rows={rows} />;
}

async function MortgagesTabContent({
  entityId,
  portfolioId,
}: {
  entityId: string;
  portfolioId?: string;
}) {
  const rows = await listMortgages(entityId, { portfolioId });
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<span className="text-2xl">🏦</span>}
        title="No mortgages"
        description="Mortgages secured against your properties will appear here."
      />
    );
  }
  return <MortgagesTable rows={rows} />;
}
