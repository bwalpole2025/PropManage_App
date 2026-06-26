import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getTaxStatementReport } from "@/services/tax-report";
import { recentTaxYears, formatPence } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { CurrencyValue } from "@/components/shared/currency-value";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TaxReportControls } from "@/components/reports/tax-report-controls";
import type { TaxBand } from "@/lib/tax";

const pct = (rate: number) => `${(rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 2)}%`;

export default async function TaxStatementReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getActiveContext();
  const years = recentTaxYears(5);
  const validBands: TaxBand[] = ["BASIC", "HIGHER", "ADDITIONAL"];
  const opts = {
    usePropertyAllowance: sp.allowance === "1",
    taxBand: validBands.includes(sp.band as TaxBand)
      ? (sp.band as TaxBand)
      : undefined,
  };
  const report = await getTaxStatementReport(ctx.entityId, sp.ty, opts);

  const exportParams = new URLSearchParams();
  exportParams.set("ty", report.taxYear);
  if (sp.band) exportParams.set("band", sp.band);
  if (sp.allowance === "1") exportParams.set("allowance", "1");

  return (
    <div className="space-y-6">
      <Link
        href="/reports"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All reports
      </Link>

      <PageHeader
        title="Tax Statement (SA105)"
        description={`${report.entityName} · ${report.landlordTypeLabel} · ${report.taxYear}`}
        actions={
          <a href={`/reports/tax-statement/export?${exportParams.toString()}`}>
            <Button variant="outline">
              <Download className="h-4 w-4" /> Download CSV
            </Button>
          </a>
        }
      />

      <DisclaimerBanner />

      <TaxReportControls years={years} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income</CardTitle>
            <CardDescription>Rents received, premiums, other income</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Sa105Table
              lines={report.incomeLines}
              emptyText="No income categorised in this tax year."
              totalLabel="Total income"
              totalPence={report.totalIncomePence}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>Allowable expenses by category</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Sa105Table
              lines={report.expenseLines}
              emptyText="No expenses categorised in this tax year."
              totalLabel="Allowable expenses"
              totalPence={report.totalAllowableExpensesPence}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tax forecast</CardTitle>
            <CardDescription>
              {report.txnCount} categorised transaction(s) · estimate only
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Total income">
              <CurrencyValue pence={report.totalIncomePence} />
            </Row>
            <Row label="Allowable expenses">
              <CurrencyValue pence={-report.totalAllowableExpensesPence} />
            </Row>
            {report.propertyAllowanceUsedPence > 0 ? (
              <Row label="Property allowance">
                <CurrencyValue pence={-report.propertyAllowanceUsedPence} />
              </Row>
            ) : null}
            <div className="border-t border-border pt-3">
              <Row label="Taxable profit" bold>
                <CurrencyValue pence={report.taxableProfitPence} />
              </Row>
            </div>
            {report.financeCostsPence > 0 ? (
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                Residential finance costs of{" "}
                <CurrencyValue pence={report.financeCostsPence} /> are not deducted
                from profit;{" "}
                {report.financeCostTaxReductionPence > 0 ? (
                  <>
                    they give a basic-rate tax reduction of{" "}
                    <CurrencyValue pence={report.financeCostTaxReductionPence} />.
                  </>
                ) : (
                  <>they are deducted as a company expense.</>
                )}
              </div>
            ) : null}
            <div className="border-t border-border pt-3">
              <Row label="Estimated tax" bold>
                <span className="text-primary">
                  <CurrencyValue pence={report.estimatedTaxPence} />
                </span>
              </Row>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax-year parameters</CardTitle>
            <CardDescription>Versioned rates for {report.taxYear}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Property allowance">
              {formatPence(report.config.propertyAllowancePence, { showPence: false })}
            </Row>
            <Row label="Finance-cost relief">
              {pct(report.config.financeCostReliefRate)}
            </Row>
            <Row label={report.config.appliedRateLabel}>
              {pct(report.config.appliedRate)}
            </Row>
            <Row label="Personal allowance">
              {formatPence(report.config.personalAllowancePence, { showPence: false })}
            </Row>
            <Row label="Higher-rate threshold">
              {formatPence(report.config.higherRateThresholdPence, { showPence: false })}
            </Row>
            <Row label="Additional-rate threshold">
              {formatPence(report.config.additionalRateThresholdPence, { showPence: false })}
            </Row>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-owner figures</CardTitle>
          <CardDescription>
            Each beneficial owner&apos;s pro-rata share from their Ownership
            percentages
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {report.owners.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              No beneficial owners with property shares yet. Assign ownership on the{" "}
              <Link href="/ownership" className="font-medium text-primary hover:underline">
                Ownership
              </Link>{" "}
              screen.
            </p>
          ) : (
            <>
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
                  {report.owners.map((o) => (
                    <TR key={o.id}>
                      <TD className="font-medium">{o.legalName}</TD>
                      <TD className="text-right tabular-nums">{o.ownedPropertyCount}</TD>
                      <TD className="text-right">
                        <CurrencyValue pence={o.totalIncomePence} />
                      </TD>
                      <TD className="text-right">
                        <CurrencyValue pence={o.totalAllowableExpensesPence} />
                      </TD>
                      <TD className="text-right">
                        <CurrencyValue pence={o.taxableProfitPence} />
                      </TD>
                      <TD className="text-right font-semibold">
                        <CurrencyValue pence={o.estimatedTaxPence} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <p className="border-t border-border p-4 text-xs text-muted-foreground">
                Each owner&apos;s figures are their pro-rata share of
                property-linked income and expenses. Account totals may also
                include items not linked to a specific property.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Sa105Table({
  lines,
  emptyText,
  totalLabel,
  totalPence,
}: {
  lines: { box: string; label: string; amountPence: number }[];
  emptyText: string;
  totalLabel: string;
  totalPence: number;
}) {
  if (lines.length === 0) {
    return <p className="p-5 text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <Table>
      <THead>
        <TR>
          <TH>Box</TH>
          <TH>Description</TH>
          <TH className="text-right">Amount</TH>
        </TR>
      </THead>
      <TBody>
        {lines.map((l) => (
          <TR key={l.box}>
            <TD>
              <Badge tone="neutral">{l.box}</Badge>
            </TD>
            <TD className="font-medium">{l.label}</TD>
            <TD className="text-right">
              <CurrencyValue pence={l.amountPence} />
            </TD>
          </TR>
        ))}
        <TR>
          <TD />
          <TD className="font-semibold">{totalLabel}</TD>
          <TD className="text-right font-semibold">
            <CurrencyValue pence={totalPence} />
          </TD>
        </TR>
      </TBody>
    </Table>
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
