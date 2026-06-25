import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { CurrencyValue } from "@/components/shared/currency-value";
import { formatBpPercent } from "@/lib/finance";
import { MortgageProductLabel } from "@/lib/enums";
import type { MortgageRow } from "@/services/properties-screen";

function ltvCell(bp: number | null) {
  if (bp === null) return <span className="text-muted-foreground">—</span>;
  const tone = bp > 8000 ? "danger" : bp > 7500 ? "warning" : "success";
  return <Badge tone={tone}>{formatBpPercent(bp)}</Badge>;
}

export function MortgagesTable({ rows }: { rows: MortgageRow[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <THead>
            <TR>
              <TH>Property</TH>
              <TH>Lender</TH>
              <TH className="text-right">Balance</TH>
              <TH className="text-right">Payment</TH>
              <TH>Rate</TH>
              <TH>LTV</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium">{r.propertyLabel}</TD>
                <TD>
                  {r.lender}
                  <p className="text-xs text-muted-foreground">
                    {MortgageProductLabel[
                      r.productType as keyof typeof MortgageProductLabel
                    ] ?? r.productType}
                  </p>
                </TD>
                <TD className="text-right">
                  <CurrencyValue pence={r.balancePence} />
                </TD>
                <TD className="whitespace-nowrap text-right">
                  <CurrencyValue pence={r.monthlyPaymentPence} />
                  /mo
                </TD>
                <TD>{formatBpPercent(r.interestRateBp)}</TD>
                <TD>{ltvCell(r.ltvBp)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
