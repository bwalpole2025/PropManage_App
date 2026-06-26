import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export interface CompanyRow {
  id: string;
  name: string;
  companyNumber: string | null;
  utr: string | null;
  vatRegistered: boolean;
  _count: { portfolios: number; beneficialOwners: number };
}

export function CompaniesTable({ companies }: { companies: CompanyRow[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <THead>
            <TR>
              <TH>Company</TH>
              <TH>Company no.</TH>
              <TH>UTR</TH>
              <TH>VAT</TH>
              <TH className="text-right">Portfolios</TH>
            </TR>
          </THead>
          <TBody>
            {companies.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium">{c.name}</TD>
                <TD className="text-muted-foreground tabular-nums">
                  {c.companyNumber ?? "—"}
                </TD>
                <TD className="text-muted-foreground tabular-nums">
                  {c.utr ?? "—"}
                </TD>
                <TD>
                  {c.vatRegistered ? (
                    <Badge tone="info">Registered</Badge>
                  ) : (
                    <Badge tone="neutral">Not registered</Badge>
                  )}
                </TD>
                <TD className="text-right tabular-nums">{c._count.portfolios}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CardContent>
      <CardContent className="border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">
          Limited companies back your business portfolios. Directors&apos; loan
          tracking is coming soon.
        </p>
      </CardContent>
    </Card>
  );
}
