import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { CurrencyValue } from "@/components/shared/currency-value";
import { daysUntil, formatDate } from "@/lib/format";
import { InsuranceTypeLabel } from "@/lib/enums";
import type { InsuranceRow } from "@/services/properties-screen";

function expiryCell(date: Date | null) {
  if (!date) return <span className="text-muted-foreground">—</span>;
  const d = daysUntil(date);
  if (d < 0) return <Badge tone="danger">Expired</Badge>;
  if (d <= 30) return <Badge tone="warning">{d}d left</Badge>;
  return <span>{formatDate(date)}</span>;
}

export function InsuranceTable({ rows }: { rows: InsuranceRow[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <THead>
            <TR>
              <TH>Property</TH>
              <TH>Type</TH>
              <TH>Provider</TH>
              <TH>Policy no.</TH>
              <TH className="text-right">Premium</TH>
              <TH>Expiry</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium">{r.propertyLabel}</TD>
                <TD>
                  {InsuranceTypeLabel[r.type as keyof typeof InsuranceTypeLabel] ??
                    r.type}
                </TD>
                <TD>{r.provider}</TD>
                <TD className="text-muted-foreground">{r.policyNumber ?? "—"}</TD>
                <TD className="text-right">
                  {r.premiumPence != null ? (
                    <CurrencyValue pence={r.premiumPence} />
                  ) : (
                    "—"
                  )}
                </TD>
                <TD>{expiryCell(r.expiryDate)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
