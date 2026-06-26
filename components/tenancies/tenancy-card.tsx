import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencyValue } from "@/components/shared/currency-value";
import { TenancyFormDialog } from "./tenancy-form-dialog";
import { formatDate } from "@/lib/format";
import {
  RentFrequencyLabel,
  TenancyStatus,
  TenancyStatusLabel,
} from "@/lib/enums";
import type { TenancyRow } from "@/services/tenancies";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 tabular-nums">{children}</div>
    </div>
  );
}

export function TenancyCard({
  row,
  canManage,
}: {
  row: TenancyRow;
  canManage: boolean;
}) {
  const statusTone =
    row.status === TenancyStatus.ACTIVE
      ? "success"
      : row.status === TenancyStatus.ENDED
        ? "neutral"
        : "warning";

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold">{row.leadTenantName}</h3>
              <Badge tone={statusTone}>
                {TenancyStatusLabel[row.status as keyof typeof TenancyStatusLabel] ??
                  row.status}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {row.propertyAddress} · {row.propertyPostcode}
            </p>
          </div>
          {canManage ? (
            <TenancyFormDialog
              mode="edit"
              tenancy={{
                id: row.id,
                leadTenantName: row.leadTenantName,
                leadTenantEmail: row.leadTenantEmail,
                propertyId: row.propertyId,
                propertyAddress: row.propertyAddress,
                rentPence: row.rentPence,
                rentFrequency: row.rentFrequency,
                rentDueDay: row.rentDueDay,
                depositPence: row.depositPence,
                depositScheme: row.depositScheme,
                startDate: row.startDate,
                endDate: row.endDate,
                status: row.status,
              }}
            />
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
          <Field label="Rent">
            <span className="font-semibold">
              <CurrencyValue pence={row.rentPence} />
            </span>{" "}
            <span className="text-xs font-normal text-muted-foreground">
              /{" "}
              {(
                RentFrequencyLabel[
                  row.rentFrequency as keyof typeof RentFrequencyLabel
                ] ?? row.rentFrequency
              ).toLowerCase()}
            </span>
          </Field>
          <Field label="Next payment">
            {row.nextPaymentDate ? formatDate(row.nextPaymentDate) : "—"}
          </Field>
          <Field label="Deposit">
            {row.depositPence != null ? (
              <CurrencyValue pence={row.depositPence} />
            ) : (
              "—"
            )}
          </Field>
          <Field label="Start">{formatDate(row.startDate)}</Field>
          <Field label="End">
            {row.endDate ? formatDate(row.endDate) : "Ongoing"}
          </Field>
          <Field label="Credit / Arrears">
            {!row.tracked ? (
              <Badge tone="neutral">Untracked</Badge>
            ) : row.arrearsPence > 0 ? (
              <span className="font-semibold text-danger">
                <CurrencyValue pence={row.arrearsPence} /> owed
              </span>
            ) : row.creditPence > 0 ? (
              <span className="font-semibold text-success">
                <CurrencyValue pence={row.creditPence} /> credit
              </span>
            ) : (
              <span className="text-success">Up to date</span>
            )}
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
