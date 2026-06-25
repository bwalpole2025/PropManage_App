import { Users2, Building2 } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { listOwnership } from "@/services/ownership";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BeneficialOwnerTypeLabel } from "@/lib/enums";

function formatPercent(bp: number): string {
  const pct = bp / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}

export default async function OwnershipPage() {
  const ctx = await getActiveContext();
  const owners = await listOwnership(ctx.entityId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ownership"
        description="Beneficial owners and their share of each property — the basis for tax splits."
      />

      {owners.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<Users2 className="h-6 w-6" />}
              title="No beneficial owners"
              description="Add owners to record who holds each property and their percentage."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {owners.map((o) => (
            <Card key={o.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users2 className="h-4 w-4" />
                  </span>
                  {o.legalName}
                </CardTitle>
                <Badge tone="neutral">
                  {BeneficialOwnerTypeLabel[
                    o.type as keyof typeof BeneficialOwnerTypeLabel
                  ] ?? o.type}
                </Badge>
              </CardHeader>
              <CardContent>
                {o.ownerships.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No property holdings recorded.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {o.ownerships.map((ow) => (
                      <li
                        key={ow.id}
                        className="flex items-center justify-between py-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {ow.property.addressLine1}
                          </span>
                        </span>
                        <span className="font-medium">
                          {formatPercent(ow.ownershipPercentageBp)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
