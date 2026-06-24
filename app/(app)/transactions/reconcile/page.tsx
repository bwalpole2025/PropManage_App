import Link from "next/link";
import { ArrowLeft, Landmark, CheckCircle2 } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { listUnreconciled } from "@/services/transactions";
import { services } from "@/lib/services";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CurrencyValue } from "@/components/shared/currency-value";
import { ReconcileButton } from "@/components/transactions/reconcile-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

export default async function ReconcilePage() {
  const ctx = await getActiveContext();
  const unreconciled = await listUnreconciled(ctx.entityId);
  const accounts = await services.bankFeed.listAccounts("mock-conn");

  return (
    <div className="space-y-6">
      <Link
        href="/transactions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to transactions
      </Link>
      <PageHeader
        title="Reconcile bank feed"
        description="Confirm imported bank transactions so your books stay accurate."
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              {accounts[0]?.name ?? "Connected account"}
            </CardTitle>
            <CardDescription>
              {accounts[0]
                ? `${accounts[0].sortCode} · ${accounts[0].accountNumberMasked}`
                : "Mock open-banking connection"}
            </CardDescription>
          </div>
          <Badge tone="info">Mock feed</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            This is a mock bank feed behind the same{" "}
            <code className="rounded bg-muted px-1">BankFeedService</code>{" "}
            interface a real provider (e.g. TrueLayer) will use — no real account
            is connected.
          </p>
        </CardContent>
      </Card>

      {unreconciled.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="All caught up"
          description="Every imported transaction has been reconciled."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Description</TH>
                  <TH>Property</TH>
                  <TH className="text-right">Amount</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {unreconciled.map((t) => (
                  <TR key={t.id}>
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {formatDate(t.date)}
                    </TD>
                    <TD className="font-medium">{t.description}</TD>
                    <TD className="text-muted-foreground">
                      {t.property?.addressLine1 ?? "—"}
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
                    <TD className="text-right">
                      <ReconcileButton transactionId={t.id} />
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
