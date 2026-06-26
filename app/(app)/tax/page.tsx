import Link from "next/link";
import { Calculator, TrendingUp, TrendingDown, Receipt, Users2 } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getTaxEstimate } from "@/services/tax";
import { getOwnerTaxEstimates } from "@/services/owner-tax";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCoachmark } from "@/components/shared/section-coachmark";
import { StatTile } from "@/components/shared/stat-tile";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { TaxControls } from "@/components/tax/tax-controls";
import { CurrencyValue } from "@/components/shared/currency-value";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Sa105Box, Sa105BoxLabel } from "@/lib/sa105";
import { LandlordTypeLabel } from "@/lib/enums";
import type { TaxBand } from "@/lib/tax";

// Display order for the SA105 boxes.
const BOX_ORDER: Sa105Box[] = [
  Sa105Box.RENTS_RECEIVED,
  Sa105Box.OTHER_PROPERTY_INCOME,
  Sa105Box.PREMIUMS_LEASES,
  Sa105Box.PROPERTY_INCOME_ALLOW,
  Sa105Box.RENT_RATES_INSURANCE,
  Sa105Box.PROPERTY_REPAIRS,
  Sa105Box.LEGAL_PROFESSIONAL,
  Sa105Box.COSTS_SERVICES,
  Sa105Box.OTHER_EXPENSES,
  Sa105Box.FINANCE_COSTS,
  Sa105Box.RESIDENTIAL_FIN_COST,
];

export default async function TaxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getActiveContext();
  const opts = {
    usePropertyAllowance: sp.allowance === "1",
    taxBand: (sp.band as TaxBand) || undefined,
  };
  const { estimate, entity, taxYear, availableYears, txnCount } =
    await getTaxEstimate(ctx.entityId, sp.ty, opts);

  // Per-owner pro-rata statements (income/expenses split by ownership %).
  const ownerTax = await getOwnerTaxEstimates(ctx.entityId, sp.ty, opts);
  const ownersWithHoldings = ownerTax.owners.filter(
    (o) => o.ownedPropertyCount > 0,
  );
  const ownerOptions = ownersWithHoldings.map((o) => ({
    id: o.owner.id,
    legalName: o.owner.legalName,
  }));
  const shownOwners = sp.owner
    ? ownersWithHoldings.filter((o) => o.owner.id === sp.owner)
    : ownersWithHoldings;

  const rows = BOX_ORDER.filter(
    (b) => (estimate.boxBreakdown[b] ?? 0) !== 0,
  );

  return (
    <div className="space-y-6">
      <SectionCoachmark section="tax" />
      <PageHeader
        title="Tax estimate"
        description={`SA105 UK property pages · ${entity.displayName} (${
          LandlordTypeLabel[entity.type as keyof typeof LandlordTypeLabel]
        })`}
      />

      <DisclaimerBanner />

      <TaxControls years={availableYears} owners={ownerOptions} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total income"
          value={<CurrencyValue pence={estimate.totalIncomePence} />}
          accent="success"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatTile
          label="Allowable expenses"
          value={<CurrencyValue pence={estimate.totalAllowableExpensesPence} />}
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <StatTile
          label="Taxable profit"
          value={<CurrencyValue pence={estimate.taxableProfitPence} />}
          accent="primary"
          icon={<Receipt className="h-4 w-4" />}
        />
        <StatTile
          label="Estimated tax"
          value={<CurrencyValue pence={estimate.estimatedTaxPence} />}
          accent="primary"
          icon={<Calculator className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>SA105 box breakdown</CardTitle>
            <CardDescription>
              {txnCount} categorised transaction(s) in {taxYear}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                No categorised transactions in this tax year yet. Categorise
                transactions to populate your SA105 boxes.
              </p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Box</TH>
                    <TH>Description</TH>
                    <TH className="text-right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((b) => (
                    <TR key={b}>
                      <TD>
                        <Badge tone="neutral">{b}</Badge>
                      </TD>
                      <TD className="font-medium">{Sa105BoxLabel[b]}</TD>
                      <TD className="text-right">
                        <CurrencyValue pence={estimate.boxBreakdown[b] ?? 0} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How this is worked out</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Total income">
              <CurrencyValue pence={estimate.totalIncomePence} />
            </Row>
            <Row label="Allowable expenses">
              <CurrencyValue pence={-estimate.totalAllowableExpensesPence} />
            </Row>
            {estimate.propertyAllowanceUsedPence > 0 ? (
              <Row label="Property allowance">
                <CurrencyValue pence={-estimate.propertyAllowanceUsedPence} />
              </Row>
            ) : null}
            <div className="border-t border-border pt-3">
              <Row label="Taxable profit" bold>
                <CurrencyValue pence={estimate.taxableProfitPence} />
              </Row>
            </div>
            {estimate.financeCostsPence > 0 ? (
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                Finance costs of{" "}
                <CurrencyValue pence={estimate.financeCostsPence} /> are{" "}
                {estimate.financeCostTaxReductionPence > 0 ? (
                  <>
                    not deducted from profit; instead they give a 20% basic-rate
                    reduction of{" "}
                    <CurrencyValue
                      pence={estimate.financeCostTaxReductionPence}
                    />
                    .
                  </>
                ) : (
                  <>deducted as a company expense.</>
                )}
              </div>
            ) : null}
            <div className="border-t border-border pt-3">
              <Row label="Estimated tax" bold>
                <span className="text-primary">
                  <CurrencyValue pence={estimate.estimatedTaxPence} />
                </span>
              </Row>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Per-owner tax (pro-rata)</CardTitle>
            <CardDescription>
              Income and expenses split by each beneficial owner&apos;s ownership
              share
            </CardDescription>
          </div>
          <Users2 className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent className="p-0">
          {shownOwners.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              No beneficial owners with property shares yet. Assign ownership on
              the{" "}
              <Link href="/ownership" className="font-medium text-primary hover:underline">
                Ownership
              </Link>{" "}
              screen to see each owner&apos;s split.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Owner</TH>
                  <TH className="text-right">Properties</TH>
                  <TH className="text-right">Taxable income</TH>
                  <TH className="text-right">Allowable expenses</TH>
                  <TH className="text-right">Taxable profit</TH>
                  <TH className="text-right">Est. tax</TH>
                </TR>
              </THead>
              <TBody>
                {shownOwners.map((o) => (
                  <TR key={o.owner.id}>
                    <TD className="font-medium">{o.owner.legalName}</TD>
                    <TD className="text-right tabular-nums">
                      {o.ownedPropertyCount}
                    </TD>
                    <TD className="text-right">
                      <CurrencyValue pence={o.estimate.totalIncomePence} />
                    </TD>
                    <TD className="text-right">
                      <CurrencyValue
                        pence={o.estimate.totalAllowableExpensesPence}
                      />
                    </TD>
                    <TD className="text-right">
                      <CurrencyValue pence={o.estimate.taxableProfitPence} />
                    </TD>
                    <TD className="text-right font-semibold">
                      <CurrencyValue pence={o.estimate.estimatedTaxPence} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
        <CardContent className="border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Each owner&apos;s £1,000 property allowance and finance-cost relief are
            applied individually, so per-owner figures may not sum exactly to the
            account total above. Untracked transactions (no property) aren&apos;t
            split between owners.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  children,
  bold,
}: {
  label: string;
  children: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-semibold" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={bold ? "font-semibold tabular-nums" : "tabular-nums"}>
        {children}
      </span>
    </div>
  );
}
