import { Calculator, TrendingUp, TrendingDown, Receipt } from "lucide-react";
import { StatTile } from "@/components/shared/stat-tile";
import { CurrencyValue } from "@/components/shared/currency-value";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Sa105Box, Sa105BoxLabel } from "@/lib/sa105";
import { formatDate } from "@/lib/format";

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

export interface TaxStatementFigures {
  boxBreakdown: Record<string, number>;
  totalIncomePence: number;
  totalAllowableExpensesPence: number;
  financeCostsPence: number;
  financeCostTaxReductionPence: number;
  propertyAllowanceUsedPence: number;
  taxableProfitPence: number;
  estimatedTaxPence: number | null;
}

export function TaxFigures({
  figures,
  heading,
  computedAt,
}: {
  figures: TaxStatementFigures;
  heading: string;
  computedAt: Date | string;
}) {
  const boxes = BOX_ORDER.filter((b) => (figures.boxBreakdown[b] ?? 0) !== 0);
  const estTax = figures.estimatedTaxPence ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{heading}</h2>
        <p className="text-xs text-muted-foreground">
          Generated {formatDate(computedAt)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total income"
          value={<CurrencyValue pence={figures.totalIncomePence} />}
          accent="success"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatTile
          label="Allowable expenses"
          value={<CurrencyValue pence={figures.totalAllowableExpensesPence} />}
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <StatTile
          label="Taxable profit"
          value={<CurrencyValue pence={figures.taxableProfitPence} />}
          accent="primary"
          icon={<Receipt className="h-4 w-4" />}
        />
        <StatTile
          label="Estimated tax"
          value={<CurrencyValue pence={estTax} />}
          accent="primary"
          icon={<Calculator className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>SA105 box breakdown</CardTitle>
            <CardDescription>UK property pages</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {boxes.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                No categorised transactions in this tax year. Categorise
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
                  {boxes.map((b) => (
                    <TR key={b}>
                      <TD>
                        <Badge tone="neutral">{b}</Badge>
                      </TD>
                      <TD className="font-medium">{Sa105BoxLabel[b]}</TD>
                      <TD className="text-right">
                        <CurrencyValue pence={figures.boxBreakdown[b] ?? 0} />
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
              <CurrencyValue pence={figures.totalIncomePence} />
            </Row>
            <Row label="Allowable expenses">
              <CurrencyValue pence={-figures.totalAllowableExpensesPence} />
            </Row>
            {figures.propertyAllowanceUsedPence > 0 ? (
              <Row label="Property allowance">
                <CurrencyValue pence={-figures.propertyAllowanceUsedPence} />
              </Row>
            ) : null}
            <div className="border-t border-border pt-3">
              <Row label="Taxable profit" bold>
                <CurrencyValue pence={figures.taxableProfitPence} />
              </Row>
            </div>
            {figures.financeCostsPence > 0 ? (
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                Finance costs of{" "}
                <CurrencyValue pence={figures.financeCostsPence} /> are{" "}
                {figures.financeCostTaxReductionPence > 0 ? (
                  <>
                    not deducted from profit; instead they give a 20% basic-rate
                    reduction of{" "}
                    <CurrencyValue pence={figures.financeCostTaxReductionPence} />.
                  </>
                ) : (
                  <>deducted as a company expense.</>
                )}
              </div>
            ) : null}
            <div className="border-t border-border pt-3">
              <Row label="Estimated tax" bold>
                <span className="text-primary">
                  <CurrencyValue pence={estTax} />
                </span>
              </Row>
            </div>
          </CardContent>
        </Card>
      </div>
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
