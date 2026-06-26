import { Users2, Briefcase, Building2 } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { getOwnershipScreen } from "@/services/ownership";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCoachmark } from "@/components/shared/section-coachmark";
import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/properties/metric-card";
import { AddPortfolioDialog } from "@/components/properties/add-portfolio-dialog";
import { OwnershipTabs } from "@/components/ownership/ownership-tabs";
import { OwnershipFilterBar } from "@/components/ownership/ownership-filter-bar";
import { AddBeneficialOwnerDialog } from "@/components/ownership/add-beneficial-owner-dialog";
import { AddCompanyDialog } from "@/components/ownership/add-company-dialog";
import { AssignOwnershipDialog } from "@/components/ownership/assign-ownership-dialog";
import { PortfolioCard } from "@/components/ownership/portfolio-card";
import { BeneficialOwnersTable } from "@/components/ownership/beneficial-owners-table";
import { CompaniesTable } from "@/components/ownership/companies-table";

export default async function OwnershipPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const tab = sp.tab ?? "portfolios";
  const ctx = await getActiveContext();
  const canManage = can(ctx.role, Capability.MANAGE_PROPERTIES);

  const data = await getOwnershipScreen(ctx.entityId, {
    property: sp.property,
    owner: sp.owner,
    sort: sp.sort,
  });

  const portfolioOptions = data.portfolios.map((p) => ({ id: p.id, name: p.name }));
  const companyOptions = data.companies.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <SectionCoachmark section="ownership" />
      <PageHeader
        title="Ownership"
        description="Model who owns what — portfolios, beneficial owners and companies — so tax is split pro-rata."
        actions={
          canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <AddPortfolioDialog />
              <AddBeneficialOwnerDialog
                portfolios={portfolioOptions}
                companies={companyOptions}
              />
              <AddCompanyDialog />
            </div>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Portfolios" value={data.summary.portfolioCount} />
        <MetricCard label="Beneficial owners" value={data.summary.ownerCount} />
        <MetricCard label="Companies" value={data.summary.companyCount} />
      </div>

      <OwnershipTabs active={tab} />
      <OwnershipFilterBar
        properties={data.filterOptions.properties}
        owners={data.filterOptions.owners}
      />

      {tab === "owners" ? (
        <div className="space-y-4">
          {canManage ? (
            <div className="flex justify-end">
              <AssignOwnershipDialog
                owners={data.filterOptions.owners}
                properties={data.filterOptions.properties}
                portfolios={portfolioOptions}
              />
            </div>
          ) : null}
          {data.owners.length === 0 ? (
            <EmptyState
              icon={<Users2 className="h-5 w-5" />}
              title="No beneficial owners"
              description="Add an owner to record who holds each property and their percentage share."
            />
          ) : (
            <BeneficialOwnersTable
              owners={data.owners}
              properties={data.filterOptions.properties}
              portfolios={portfolioOptions}
              ownerOptions={data.filterOptions.owners}
              canManage={canManage}
            />
          )}
        </div>
      ) : tab === "companies" ? (
        data.companies.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="No companies"
            description="Add a limited company to back a business portfolio."
          />
        ) : (
          <CompaniesTable companies={data.companies} />
        )
      ) : data.portfolios.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-5 w-5" />}
          title="No portfolios"
          description="Add a portfolio to group properties as personal or business."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.portfolios.map((p) => (
            <PortfolioCard key={p.id} portfolio={p} />
          ))}
        </div>
      )}
    </div>
  );
}
