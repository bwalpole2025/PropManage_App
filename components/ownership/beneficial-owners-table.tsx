import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssignOwnershipDialog } from "./assign-ownership-dialog";
import { formatBpPercent } from "@/lib/finance";
import { BeneficialOwnerTypeLabel } from "@/lib/enums";
import type { OwnershipScreenOwner } from "@/services/ownership";

export function BeneficialOwnersTable({
  owners,
  properties,
  portfolios,
  ownerOptions,
  canManage,
}: {
  owners: OwnershipScreenOwner[];
  properties: { id: string; addressLine1: string }[];
  portfolios: { id: string; name: string }[];
  ownerOptions: { id: string; legalName: string }[];
  canManage: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {owners.map((o) => (
        <Card key={o.id}>
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{o.legalName}</h3>
              <Badge tone="neutral">
                {BeneficialOwnerTypeLabel[
                  o.type as keyof typeof BeneficialOwnerTypeLabel
                ] ?? o.type}
              </Badge>
            </div>

            {o.shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No property holdings recorded.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {o.shares.map((s) => (
                  <li
                    key={s.propertyId}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">{s.addressLine1}</span>
                    <span className="font-medium tabular-nums">
                      {formatBpPercent(s.bp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              {canManage ? (
                <AssignOwnershipDialog
                  owners={ownerOptions}
                  properties={properties}
                  portfolios={portfolios}
                  ownerId={o.id}
                  triggerLabel="Assign ownership"
                />
              ) : null}
              <Link
                href={`/tax?owner=${o.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                View tax estimate →
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
