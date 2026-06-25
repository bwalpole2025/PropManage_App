import { KeyRound } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { listTenancies } from "@/services/tenancies";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCoachmark } from "@/components/shared/section-coachmark";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatPence, formatDate } from "@/lib/format";
import {
  TenancyStatus,
  TenancyStatusLabel,
  TenancyArrearsState,
  RentFrequencyLabel,
} from "@/lib/enums";

const statusTone: Record<string, "success" | "warning" | "neutral" | "info"> = {
  [TenancyStatus.ACTIVE]: "success",
  [TenancyStatus.VOID]: "warning",
  [TenancyStatus.ENDED]: "neutral",
  [TenancyStatus.DRAFT]: "info",
};

export default async function TenanciesPage() {
  const ctx = await getActiveContext();
  const tenancies = await listTenancies(ctx.entityId);

  return (
    <div className="space-y-6">
      <SectionCoachmark section="tenancies" />
      <PageHeader
        title="Tenancies"
        description="Every tenancy across your portfolio, with rent and arrears at a glance."
      />

      <Card>
        <CardContent className="p-0">
          {tenancies.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<KeyRound className="h-6 w-6" />}
                title="No tenancies yet"
                description="Add a tenancy from a property to start tracking rent and arrears."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Property</TH>
                  <TH>Lead tenant</TH>
                  <TH>Rent</TH>
                  <TH>Start</TH>
                  <TH>Status</TH>
                  <TH>Balance</TH>
                </TR>
              </THead>
              <TBody>
                {tenancies.map((t) => (
                  <TR key={t.id}>
                    <TD className="font-medium">
                      {t.property.addressLine1}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {t.property.postcode}
                      </span>
                    </TD>
                    <TD className="text-muted-foreground">
                      {t.tenants[0]?.name ?? "—"}
                    </TD>
                    <TD>
                      {formatPence(t.rentPence)}
                      <span className="block text-xs text-muted-foreground">
                        {RentFrequencyLabel[
                          t.rentFrequency as keyof typeof RentFrequencyLabel
                        ] ?? t.rentFrequency}
                      </span>
                    </TD>
                    <TD className="text-muted-foreground">
                      {formatDate(t.startDate)}
                    </TD>
                    <TD>
                      <Badge tone={statusTone[t.status] ?? "neutral"}>
                        {TenancyStatusLabel[
                          t.status as keyof typeof TenancyStatusLabel
                        ] ?? t.status}
                      </Badge>
                    </TD>
                    <TD>
                      {t.arrearsState === TenancyArrearsState.ARREARS ? (
                        <Badge tone="danger">
                          {formatPence(Math.abs(t.balancePence))} owed
                        </Badge>
                      ) : t.arrearsState === TenancyArrearsState.CREDIT ? (
                        <Badge tone="info">
                          {formatPence(t.balancePence)} credit
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Up to date
                        </span>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
