import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getProperty } from "@/services/properties";
import { can, Capability } from "@/lib/auth/rbac";
import { AddComplianceForm } from "@/components/properties/add-compliance-form";
import { EmptyState } from "@/components/shared/empty-state";
import { ReminderBadge } from "@/components/shared/reminder-badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { ComplianceTypeLabel } from "@/lib/enums";

export default async function CompliancePage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const ctx = await getActiveContext();
  const property = await getProperty(ctx.entityId, propertyId);
  if (!property) notFound();
  const canManage = can(ctx.role, Capability.MANAGE_FILES);

  return (
    <div className="space-y-5">
      {canManage ? <AddComplianceForm propertyId={propertyId} /> : null}

      {property.complianceDocs.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-5 w-5" />}
          title="No certificates"
          description="Store gas safety, EPC, EICR and other documents with expiry reminders."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Type</TH>
                  <TH>Reference</TH>
                  <TH>Expires</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {property.complianceDocs.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium">
                      {ComplianceTypeLabel[
                        c.type as keyof typeof ComplianceTypeLabel
                      ] ?? c.type}
                    </TD>
                    <TD className="text-muted-foreground">
                      {c.reference ?? "—"}
                    </TD>
                    <TD>{formatDate(c.expiryDate)}</TD>
                    <TD>
                      <ReminderBadge date={c.expiryDate} />
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
