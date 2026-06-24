import { notFound } from "next/navigation";
import { Users, ReceiptText, ShieldCheck } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getProperty } from "@/services/properties";
import { StatTile } from "@/components/shared/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyValue } from "@/components/shared/currency-value";
import { ReminderBadge } from "@/components/shared/reminder-badge";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPenceCompact } from "@/lib/format";
import { ComplianceTypeLabel } from "@/lib/enums";
import { Sa105CategoryLabel, isSa105Category } from "@/lib/sa105";

export default async function PropertyOverviewPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const { entityId } = await getActiveContext();
  const property = await getProperty(entityId, propertyId);
  if (!property) notFound();

  const activeTenancies = property.tenancies.filter((t) => t.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Active tenancies"
          value={activeTenancies.length}
          icon={<Users className="h-4 w-4" />}
        />
        <StatTile
          label="Income (recent)"
          value={formatPenceCompact(property.summary.incomePence)}
          accent="success"
          icon={<ReceiptText className="h-4 w-4" />}
        />
        <StatTile
          label="Expenses (recent)"
          value={formatPenceCompact(property.summary.expensePence)}
          icon={<ReceiptText className="h-4 w-4" />}
        />
        <StatTile
          label="Certificates"
          value={property.complianceDocs.length}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {property.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {property.transactions.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.date)}
                        {isSa105Category(t.category)
                          ? ` · ${Sa105CategoryLabel[t.category]}`
                          : ""}
                      </p>
                    </div>
                    <CurrencyValue
                      pence={t.direction === "EXPENSE" ? -t.amountPence : t.amountPence}
                      tone="auto"
                      signed
                      className="text-sm font-semibold"
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            {property.complianceDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No certificates stored.
              </p>
            ) : (
              <ul className="space-y-3">
                {property.complianceDocs.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {ComplianceTypeLabel[
                          c.type as keyof typeof ComplianceTypeLabel
                        ] ?? c.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires {formatDate(c.expiryDate)}
                      </p>
                    </div>
                    <ReminderBadge date={c.expiryDate} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
