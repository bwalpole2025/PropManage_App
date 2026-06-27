import { PawPrint } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getPetRequests, getComplianceFormData } from "@/services/compliance/lists";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { PetRequestStatus, PetRequestStatusLabel } from "@/lib/enums";
import { ragForExpiry, PET_AMBER_DAYS } from "@/lib/compliance/rules";
import { RagBadge } from "@/components/compliance/rag";
import { PetRequestForm, PetDecideForm } from "@/components/compliance/pet-forms";

export const dynamic = "force-dynamic";

const PENDING = new Set<string>([
  PetRequestStatus.PENDING,
  PetRequestStatus.INFO_REQUESTED,
]);

export default async function PetsPage() {
  const ctx = await getActiveContext();
  const [pets, form] = await Promise.all([
    getPetRequests(ctx.entityId),
    getComplianceFormData(ctx.entityId),
  ]);
  const now = new Date();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pet requests"
        description="Renters' Rights Act 2025 — respond within 28 days (42 with a reasonable info request); refusal must be reasonable."
      />

      <PetRequestForm tenancies={form.tenancies} />

      {pets.length === 0 ? (
        <EmptyState
          icon={<PawPrint className="h-5 w-5" />}
          title="No pet requests"
          description="Log a tenant's pet request to track the statutory response deadline."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Pet</TH>
                  <TH>Property / tenant</TH>
                  <TH>Requested</TH>
                  <TH>Respond by</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {pets.map((p) => {
                  const pending = PENDING.has(p.status);
                  return (
                    <TR key={p.id}>
                      <TD className="font-medium">{p.petDescription}</TD>
                      <TD className="text-muted-foreground">
                        {p.tenancy.property.addressLine1}
                        {p.tenancy.tenants[0]?.name ? ` · ${p.tenancy.tenants[0].name}` : ""}
                      </TD>
                      <TD className="text-sm">{formatDate(p.requestedDate)}</TD>
                      <TD>
                        {pending ? (
                          <div className="flex items-center gap-2">
                            <RagBadge rag={ragForExpiry(p.responseDeadline, now, PET_AMBER_DAYS)} />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(p.responseDeadline)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD>
                        {pending ? (
                          <PetDecideForm petRequestId={p.id} />
                        ) : (
                          <div className="text-sm">
                            {PetRequestStatusLabel[p.status as keyof typeof PetRequestStatusLabel] ??
                              p.status}
                            {p.decisionReason ? (
                              <p className="text-xs text-muted-foreground">{p.decisionReason}</p>
                            ) : null}
                          </div>
                        )}
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
