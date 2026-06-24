import Link from "next/link";
import { Building2, Plus, AlertTriangle, ShieldAlert } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { listProperties } from "@/services/properties";
import { can, Capability } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyValue } from "@/components/shared/currency-value";
import { PropertyTypeLabel } from "@/lib/enums";

export default async function PropertiesPage() {
  const ctx = await getActiveContext();
  const properties = await listProperties(ctx.entityId);
  const canManage = can(ctx.role, Capability.MANAGE_PROPERTIES);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Properties"
        description="Every rental in this account, with rent and compliance at a glance."
        actions={
          canManage ? (
            <Link href="/properties/new">
              <Button>
                <Plus className="h-4 w-4" /> Add property
              </Button>
            </Link>
          ) : null
        }
      />

      {properties.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title="No properties yet"
          description="Add your first property to start tracking rent, expenses and compliance."
          action={
            canManage ? (
              <Link href="/properties/new">
                <Button>
                  <Plus className="h-4 w-4" /> Add property
                </Button>
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Link key={p.id} href={`/properties/${p.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="flex gap-1">
                      {p.hasArrears ? (
                        <Badge tone="danger">
                          <AlertTriangle className="h-3 w-3" /> Arrears
                        </Badge>
                      ) : null}
                      {p.complianceDueSoon > 0 ? (
                        <Badge tone="warning">
                          <ShieldAlert className="h-3 w-3" /> {p.complianceDueSoon}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <h3 className="mt-3 font-semibold leading-tight">
                    {p.addressLine1}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {p.city}, {p.postcode}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-muted-foreground">
                      {PropertyTypeLabel[
                        p.propertyType as keyof typeof PropertyTypeLabel
                      ] ?? p.propertyType}
                    </span>
                    <span className="font-medium">
                      <CurrencyValue pence={p.monthlyRentPence} />/mo
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.activeTenancies} active tenanc
                    {p.activeTenancies === 1 ? "y" : "ies"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
