import Link from "next/link";
import { Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencyValue } from "@/components/shared/currency-value";
import { AddTenancyForm } from "@/components/properties/add-tenancy-form";
import { formatDate } from "@/lib/format";
import { RentFrequencyLabel, RentStatus, TenancyStatus } from "@/lib/enums";

interface TenancyLike {
  id: string;
  status: string;
  rentPence: number;
  rentFrequency: string;
  startDate: Date | string;
  tenants: { name: string; email: string | null; isLeadTenant: boolean }[];
  rentSchedule: { status: string }[];
}

/** Current tenancy summary (rent + tracking state) with add/review actions. */
export function TenantsSummary({
  tenancies,
  propertyId,
  canManage,
}: {
  tenancies: TenancyLike[];
  propertyId: string;
  canManage: boolean;
}) {
  const active = tenancies.find((t) => t.status === TenancyStatus.ACTIVE);
  const lead = active
    ? active.tenants.find((x) => x.isLeadTenant) ?? active.tenants[0]
    : undefined;
  const arrears = active
    ? active.rentSchedule.some(
        (r) => r.status === RentStatus.OVERDUE || r.status === RentStatus.PARTIAL,
      )
    : false;
  const tracking = active ? active.rentSchedule.length > 0 : false;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Tenants</CardTitle>
        <Users className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="space-y-4">
        {active ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{lead?.name ?? "Tenant"}</h3>
                <Badge tone="success">Occupied</Badge>
                {arrears ? (
                  <Badge tone="danger">In arrears</Badge>
                ) : tracking ? (
                  <Badge tone="success">Up to date</Badge>
                ) : (
                  <Badge tone="neutral">Not tracking</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Started {formatDate(active.startDate)}
                {lead?.email ? ` · ${lead.email}` : ""}
              </p>
            </div>
            <div className="text-right">
              <CurrencyValue
                pence={active.rentPence}
                className="text-lg font-semibold"
              />
              <p className="text-xs text-muted-foreground">
                {RentFrequencyLabel[
                  active.rentFrequency as keyof typeof RentFrequencyLabel
                ] ?? active.rentFrequency}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Badge tone="warning">Vacant</Badge>
            <p className="text-sm text-muted-foreground">
              No active tenancy for this property.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          {canManage ? <AddTenancyForm propertyId={propertyId} /> : null}
          <Link
            href={`/properties/${propertyId}/tenancies`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Review all →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
