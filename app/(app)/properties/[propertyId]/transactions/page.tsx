import { notFound } from "next/navigation";
import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/shared/empty-state";
import { CurrencyValue } from "@/components/shared/currency-value";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { Sa105CategoryLabel, isSa105Category } from "@/lib/sa105";

export default async function PropertyTransactionsPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const { entityId } = await getActiveContext();

  const property = await prisma.property.findFirst({
    where: { id: propertyId, landlordEntityId: entityId },
    select: { id: true },
  });
  if (!property) notFound();

  const transactions = await prisma.transaction.findMany({
    where: { propertyId, landlordEntityId: entityId },
    orderBy: { date: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing the latest {transactions.length} transactions for this property.
        </p>
        <Link
          href="/transactions/new"
          className="text-sm font-medium text-primary hover:underline"
        >
          Add transaction →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="h-5 w-5" />}
          title="No transactions"
          description="Rent and expenses linked to this property will appear here."
        />
      ) : (
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
                      {isSa105Category(t.category) ? (
                        <Badge tone="neutral">
                          {Sa105CategoryLabel[t.category]}
                        </Badge>
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
      )}
    </div>
  );
}
