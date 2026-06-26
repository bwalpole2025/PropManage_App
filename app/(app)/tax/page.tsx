import { cookies } from "next/headers";
import { Calculator } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { premiumLocked } from "@/lib/subscription";
import { PremiumGate } from "@/components/shared/premium-gate";
import {
  listTaxStatementYears,
  getTaxStatement,
} from "@/services/tax-statements";
import { recentTaxYears, taxYearLabelFor } from "@/lib/format";
import { taxAckCookieName } from "@/lib/tax-ack";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCoachmark } from "@/components/shared/section-coachmark";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { TaxDisclaimerGate } from "@/components/tax/tax-disclaimer-gate";
import { CreateTaxStatementDialog } from "@/components/tax/create-tax-statement-dialog";
import { TaxStatementYearSelect } from "@/components/tax/tax-statement-year-select";
import { TaxOwnerChips } from "@/components/tax/tax-owner-chips";
import { TaxFigures, type TaxStatementFigures } from "@/components/tax/tax-figures";

const DESCRIPTION =
  "Keep tabs on your upcoming tax bill with business partners, assistants and advisors. Estimates are guidance only — filter by owner to see each person's pro-rata share.";

interface StatementRow {
  boxBreakdown: unknown;
  totalIncomePence: number;
  totalAllowableExpensesPence: number;
  financeCostsPence: number;
  financeCostTaxReductionPence: number;
  propertyAllowanceUsedPence: number;
  taxableProfitPence: number;
  estimatedTaxPence: number | null;
}

function toFigures(r: StatementRow): TaxStatementFigures {
  return {
    boxBreakdown: (r.boxBreakdown ?? {}) as Record<string, number>,
    totalIncomePence: r.totalIncomePence,
    totalAllowableExpensesPence: r.totalAllowableExpensesPence,
    financeCostsPence: r.financeCostsPence,
    financeCostTaxReductionPence: r.financeCostTaxReductionPence,
    propertyAllowanceUsedPence: r.propertyAllowanceUsedPence,
    taxableProfitPence: r.taxableProfitPence,
    estimatedTaxPence: r.estimatedTaxPence,
  };
}

export default async function TaxStatementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getActiveContext();
  const canRunTax = can(ctx.role, Capability.RUN_TAX);

  // Premium gate: blur the figures behind an "UNLOCK YOUR DATA" overlay unless
  // the account subscription is active.
  const billing = await prisma.account.findUnique({
    where: { id: ctx.entityId },
    select: { subscriptionStatus: true },
  });
  const locked = premiumLocked(billing?.subscriptionStatus);

  const store = await cookies();
  const accepted = store.get(taxAckCookieName(ctx.entityId))?.value === "1";

  // The acknowledgement gate: no figures are fetched or rendered until accepted.
  if (!accepted) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tax Statements" description={DESCRIPTION} />
        <TaxDisclaimerGate />
      </div>
    );
  }

  const years = await listTaxStatementYears(ctx.entityId);
  const createYears = recentTaxYears(5);
  // Only select a year that actually has a statement, so the year <Select> never
  // has a value without a matching <option>.
  const known = new Set(years.map((y) => y.taxYearLabel));
  const selectedYear =
    sp.ty && known.has(sp.ty)
      ? sp.ty
      : (years[0]?.taxYearLabel ?? taxYearLabelFor());
  const statement = await getTaxStatement(ctx.entityId, selectedYear);

  const ownerRow =
    statement && sp.owner
      ? statement.owners.find((o) => o.beneficialOwnerId === sp.owner)
      : null;

  return (
    <div className="space-y-6">
      <SectionCoachmark section="tax" />
      <PageHeader
        title="Tax Statements"
        description={DESCRIPTION}
        actions={
          canRunTax ? <CreateTaxStatementDialog years={createYears} /> : null
        }
      />

      <DisclaimerBanner />

      {years.length > 0 ? (
        <TaxStatementYearSelect years={years} selected={selectedYear} />
      ) : null}

      {!statement ? (
        <EmptyState
          icon={<Calculator className="h-5 w-5" />}
          title={`No tax statement for ${selectedYear}`}
          description="Create a statement to see your estimated tax position for this year."
          action={
            canRunTax ? <CreateTaxStatementDialog years={createYears} /> : null
          }
        />
      ) : (
        <div className="space-y-5">
          {statement.owners.length > 0 ? (
            <TaxOwnerChips
              owners={statement.owners.map((o) => ({
                id: o.beneficialOwner!.id,
                name: o.beneficialOwner!.legalName,
              }))}
              // Only highlight an owner chip when its row is actually shown, so a
              // stale ?owner= doesn't contradict the displayed figures.
              active={ownerRow ? sp.owner : undefined}
            />
          ) : null}

          <PremiumGate
            locked={locked}
            description="Subscribe to view your estimated tax position."
          >
            <TaxFigures
              figures={toFigures(ownerRow ?? statement.account)}
              heading={
                ownerRow
                  ? `${ownerRow.beneficialOwner!.legalName} — pro-rata share`
                  : "Whole portfolio"
              }
              computedAt={statement.computedAt}
            />
          </PremiumGate>

          {statement.owners.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Per-owner figures are each owner&apos;s pro-rata share from their
              Ownership percentages. Each owner&apos;s £1,000 property allowance and
              finance-cost relief are applied individually, so they may not sum
              exactly to the whole-portfolio total. Untracked transactions (no
              property) aren&apos;t split between owners.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
