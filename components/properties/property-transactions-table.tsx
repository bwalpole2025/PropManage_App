import { ReceiptText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { CurrencyValue } from "@/components/shared/currency-value";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { categoryLabel, isKnownCategory } from "@/lib/categories";

export interface PropertyTxnRow {
  id: string;
  description: string;
  category: string | null;
  date: Date | string;
  direction: string;
  amountPence: number;
}

/** Property-scoped transactions table, shared by the detail page + the ledger sub-route. */
export function PropertyTransactionsTable({
  transactions,
}: {
  transactions: PropertyTxnRow[];
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptText className="h-5 w-5" />}
        title="No transactions"
        description="Rent and expenses linked to this property will appear here."
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Description</TH>
              <TH>Category</TH>
              <TH className="text-right">Amount</TH>
            </TR>
          </THead>
          <TBody>
            {transactions.map((t) => (
              <TR key={t.id}>
                <TD className="whitespace-nowrap text-muted-foreground">
                  {formatDate(t.date)}
                </TD>
                <TD className="font-medium">{t.description}</TD>
                <TD>
                  {isKnownCategory(t.category) ? (
                    <Badge tone="neutral">{categoryLabel(t.category)}</Badge>
                  ) : (
                    <Badge tone="warning">Uncategorised</Badge>
                  )}
                </TD>
                <TD className="text-right">
                  <CurrencyValue
                    pence={
                      t.direction === "EXPENSE" ? -t.amountPence : t.amountPence
                    }
                    tone="auto"
                    signed
                    className="font-semibold"
                  />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
