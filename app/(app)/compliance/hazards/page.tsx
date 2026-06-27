import { Flame } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getHazards, getComplianceFormData } from "@/services/compliance/lists";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import {
  HazardCategoryLabel,
  HazardSeverity,
  HazardSeverityLabel,
  HazardStatus,
  HazardStatusLabel,
  ComplianceRag,
} from "@/lib/enums";
import { ragForExpiry, HAZARD_AMBER_DAYS } from "@/lib/compliance/rules";
import { RagBadge } from "@/components/compliance/rag";
import {
  ReportHazardForm,
  HazardStatusActions,
} from "@/components/compliance/hazard-forms";

export const dynamic = "force-dynamic";

export default async function HazardsPage() {
  const ctx = await getActiveContext();
  const [hazards, form] = await Promise.all([
    getHazards(ctx.entityId),
    getComplianceFormData(ctx.entityId),
  ]);
  const now = new Date();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hazards & repairs"
        description="Awaab's Law / Decent Homes — log hazards and track the statutory inspection and repair deadlines."
      />

      <ReportHazardForm properties={form.properties} />

      {hazards.length === 0 ? (
        <EmptyState
          icon={<Flame className="h-5 w-5" />}
          title="No hazards logged"
          description="Report a damp & mould or other HHSRS hazard to start its SLA countdown."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Hazard</TH>
                  <TH>Property</TH>
                  <TH>Severity</TH>
                  <TH>Deadline</TH>
                  <TH>Status</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {hazards.map((h) => {
                  const resolved = h.status === HazardStatus.RESOLVED;
                  const deadline = h.investigatedAt ? h.repairStartByDate : h.investigateByDate;
                  const rag =
                    resolved
                      ? ComplianceRag.GREEN
                      : h.status === HazardStatus.BREACHED
                        ? ComplianceRag.RED
                        : deadline
                          ? ragForExpiry(deadline, now, HAZARD_AMBER_DAYS)
                          : ComplianceRag.AMBER;
                  return (
                    <TR key={h.id}>
                      <TD className="font-medium">
                        {HazardCategoryLabel[h.category as keyof typeof HazardCategoryLabel] ??
                          h.category}
                      </TD>
                      <TD className="text-muted-foreground">{h.property.addressLine1}</TD>
                      <TD>
                        <Badge
                          tone={
                            h.severity === HazardSeverity.EMERGENCY
                              ? "danger"
                              : h.severity === HazardSeverity.SIGNIFICANT
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {HazardSeverityLabel[h.severity as keyof typeof HazardSeverityLabel] ??
                            h.severity}
                        </Badge>
                      </TD>
                      <TD>
                        {resolved ? (
                          <span className="text-xs text-muted-foreground">
                            Resolved {h.resolvedAt ? formatDate(h.resolvedAt) : ""}
                          </span>
                        ) : deadline ? (
                          <div className="flex items-center gap-2">
                            <RagBadge
                              rag={rag}
                              label={h.investigatedAt ? "Repair" : "Investigate"}
                            />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(deadline)}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TD>
                      <TD className="text-sm">
                        {HazardStatusLabel[h.status as keyof typeof HazardStatusLabel] ?? h.status}
                      </TD>
                      <TD>
                        <HazardStatusActions hazardId={h.id} status={h.status} />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
