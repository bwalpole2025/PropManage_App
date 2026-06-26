import { notFound } from "next/navigation";
import { getActiveContext } from "@/lib/auth/active-org";
import { getPropertyDetail } from "@/services/properties";
import { StatTile } from "@/components/shared/stat-tile";
import { EmptyState } from "@/components/shared/empty-state";
import { CurrencyValue } from "@/components/shared/currency-value";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatBpPercent, loanToValueBp } from "@/lib/finance";
import { formatDate } from "@/lib/format";
import { MortgageProductLabel, type MortgageProduct } from "@/lib/enums";

function ltvTone(bp: number | null): "success" | "warning" | "danger" | "neutral" {
  if (bp == null) return "neutral";
  if (bp < 6000) return "success";
  if (bp < 8000) return "warning";
  return "danger";
}

export default async function MortgagesValuationsPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const ctx = await getActiveContext();
  const detail = await getPropertyDetail(ctx.entityId, propertyId);
  if (!detail) notFound();

  const { property, header } = detail;
  const valuation = header.latestValuationPence;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Total mortgage balance"
          value={
            <CurrencyValue
              pence={header.mortgageBalancePence}
              className="text-2xl font-semibold"
            />
          }
        />
        <StatTile
          label="Latest valuation"
          value={
            valuation != null ? (
              <CurrencyValue pence={valuation} className="text-2xl font-semibold" />
            ) : (
              "—"
            )
          }
        />
        <StatTile label="Loan to value" value={formatBpPercent(header.ltvBp)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mortgages</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {property.mortgages.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<span className="text-2xl">🏦</span>}
                title="No mortgages"
                description="Mortgages secured against this property will appear here."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Lender</TH>
                  <TH>Product</TH>
                  <TH className="text-right">Balance</TH>
                  <TH className="text-right">Monthly payment</TH>
                  <TH className="text-right">Rate</TH>
                  <TH className="text-right">LTV</TH>
                </TR>
              </THead>
              <TBody>
                {property.mortgages.map((m) => {
                  const ltv = loanToValueBp(m.balancePence, valuation);
                  return (
                    <TR key={m.id}>
                      <TD className="font-medium">{m.lender}</TD>
                      <TD className="text-muted-foreground">
                        {MortgageProductLabel[m.productType as MortgageProduct] ??
                          m.productType}
                      </TD>
                      <TD className="text-right">
                        <CurrencyValue pence={m.balancePence} className="font-semibold" />
                      </TD>
                      <TD className="text-right">
                        <CurrencyValue pence={m.monthlyPaymentPence} />
                      </TD>
                      <TD className="text-right tabular-nums">
                        {formatBpPercent(m.interestRateBp)}
                      </TD>
                      <TD className="text-right">
                        <Badge tone={ltvTone(ltv)}>{formatBpPercent(ltv)}</Badge>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valuations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {property.valuations.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<span className="text-2xl">📈</span>}
                title="No valuations"
                description="A valuation history builds up as you record property values."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Source</TH>
                  <TH className="text-right">Amount</TH>
                </TR>
              </THead>
              <TBody>
                {property.valuations.map((v) => (
                  <TR key={v.id}>
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {formatDate(v.date)}
                    </TD>
                    <TD className="text-muted-foreground">{v.source ?? "—"}</TD>
                    <TD className="text-right">
                      <CurrencyValue pence={v.amountPence} className="font-semibold" />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
