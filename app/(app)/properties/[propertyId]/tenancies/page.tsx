import { notFound } from "next/navigation";
import { getActiveContext } from "@/lib/auth/active-org";
import { getProperty } from "@/services/properties";
import { can, Capability } from "@/lib/auth/rbac";
import { AddTenancyForm } from "@/components/properties/add-tenancy-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencyValue } from "@/components/shared/currency-value";
import { formatDate } from "@/lib/format";
import { RentFrequencyLabel, RentStatus } from "@/lib/enums";
import { Users } from "lucide-react";

export default async function TenanciesPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const ctx = await getActiveContext();
  const property = await getProperty(ctx.entityId, propertyId);
  if (!property) notFound();
  const canManage = can(ctx.role, Capability.MANAGE_PROPERTIES);

  return (
    <div className="space-y-5">
      {canManage ? <AddTenancyForm propertyId={propertyId} /> : null}

      {property.tenancies.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No tenancies"
          description="Add a tenancy to track rent due and arrears."
        />
      ) : (
        <div className="space-y-4">
          {property.tenancies.map((t) => {
            const lead = t.tenants.find((x) => x.isLeadTenant) ?? t.tenants[0];
            const overdue = t.rentSchedule.filter(
              (r) => r.status === RentStatus.OVERDUE || r.status === RentStatus.PARTIAL,
            );
            return (
              <Card key={t.id}>
                <CardContent className="pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {lead?.name ?? "Tenant"}
                          {t.tenants.length > 1
                            ? ` +${t.tenants.length - 1}`
                            : ""}
                        </h3>
                        <Badge
                          tone={t.status === "ACTIVE" ? "success" : "neutral"}
                        >
                          {t.status}
                        </Badge>
                        {overdue.length > 0 ? (
                          <Badge tone="danger">In arrears</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Started {formatDate(t.startDate)}
                        {lead?.email ? ` · ${lead.email}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <CurrencyValue
                        pence={t.rentPence}
                        className="text-lg font-semibold"
                      />
                      <p className="text-xs text-muted-foreground">
                        {RentFrequencyLabel[
                          t.rentFrequency as keyof typeof RentFrequencyLabel
                        ] ?? t.rentFrequency}
                      </p>
                    </div>
                  </div>

                  {t.rentSchedule.length > 0 ? (
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Recent rent periods
                      </p>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {t.rentSchedule.map((r) => (
                          <li
                            key={r.id}
                            className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
                          >
                            <span>{formatDate(r.dueDate)}</span>
                            <span className="flex items-center gap-2">
                              <Badge
                                tone={
                                  r.status === "PAID"
                                    ? "success"
                                    : r.status === "OVERDUE"
                                      ? "danger"
                                      : r.status === "PARTIAL"
                                        ? "warning"
                                        : "neutral"
                                }
                              >
                                {r.status}
                              </Badge>
                              <CurrencyValue pence={r.receivedPence} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
