import Link from "next/link";
import { Plus } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getOverviewData } from "@/services/overview";
import { PageHeader } from "@/components/shared/page-header";
import { OnboardingChecklist } from "@/components/shared/onboarding-checklist";
import { OverviewHelpMenu } from "@/components/dashboard/help-menu";
import { HelpBanner } from "@/components/dashboard/help-banner";
import { ProfitLossWidget } from "@/components/dashboard/widgets/profit-loss-widget";
import { AssetAnalysisWidget } from "@/components/dashboard/widgets/asset-analysis-widget";
import { OccupancyWidget } from "@/components/dashboard/widgets/occupancy-widget";
import { ArrearsWidget } from "@/components/dashboard/widgets/arrears-widget";
import { UpcomingPaymentsWidget } from "@/components/dashboard/widgets/upcoming-payments-widget";
import { RentCollectionWidget } from "@/components/dashboard/widgets/rent-collection-widget";
import { MarketRiskWidget } from "@/components/dashboard/widgets/market-risk-widget";
import { RentalYieldsWidget } from "@/components/dashboard/widgets/rental-yields-widget";
import { TaxEstimateWidget } from "@/components/dashboard/widgets/tax-estimate-widget";
import { ComplianceWidget } from "@/components/dashboard/widgets/compliance-widget";

export default async function DashboardPage() {
  const ctx = await getActiveContext();
  const data = await getOverviewData(ctx.entityId, ctx.user.id);

  const steps = [
    {
      key: "property",
      title: "Add a property",
      description: "Tell us about your first rental property.",
      href: "/properties/new",
      cta: "Add property",
      done: data.onboarding.hasProperty,
    },
    {
      key: "tenancy",
      title: "Add a tenancy",
      description: "Record the tenant, rent and frequency.",
      href: "/properties",
      cta: "Add tenancy",
      done: data.onboarding.hasTenancy,
    },
    {
      key: "transaction",
      title: "Track a rental transaction",
      description: "Log rent received or an expense.",
      href: "/transactions/new",
      cta: "Add transaction",
      done: data.onboarding.hasTransaction,
      badge: data.onboarding.transactionCount
        ? String(data.onboarding.transactionCount)
        : undefined,
    },
  ];

  const locked = !data.pnl.hasTransactions;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={`Overview for ${ctx.entityName} · tax year ${data.taxYear}`}
        actions={
          <>
            <OverviewHelpMenu />
            <Link
              href="/properties/new"
              aria-label="Add property"
              title="Add property"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
            </Link>
          </>
        }
      />

      <HelpBanner />

      <OnboardingChecklist
        steps={steps}
        emailUnverified={data.onboarding.emailUnverified}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ProfitLossWidget
          pnl={data.pnl}
          taxYearLabel={data.taxYear}
          className="sm:col-span-2"
        />
        <OccupancyWidget occupancy={data.occupancy} />
        <AssetAnalysisWidget asset={data.asset} />
        <RentCollectionWidget data={data.rentCollection} locked={locked} />
        <ArrearsWidget arrears={data.arrears} className="sm:col-span-2" />
        <UpcomingPaymentsWidget upcoming={data.upcoming} />
        <RentalYieldsWidget yields={data.yields} />
        <MarketRiskWidget risk={data.marketRisk} />
        <TaxEstimateWidget tax={data.tax} taxYear={data.taxYear} />
        <ComplianceWidget compliance={data.compliance} />
      </div>
    </div>
  );
}
