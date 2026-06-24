import { notFound } from "next/navigation";
import { Users2 } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getProperty } from "@/services/properties";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function OwnersPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const { entityId } = await getActiveContext();
  const property = await getProperty(entityId, propertyId);
  if (!property) notFound();

  const shares = property.ownershipShares;
  const totalBp = shares.reduce((s, o) => s + o.percentageBp, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Beneficial ownership</CardTitle>
          <CardDescription>
            Income is apportioned to owners by these shares for tax. Owners may
            include people who don&apos;t have a login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shares.length === 0 ? (
            <EmptyState
              icon={<Users2 className="h-5 w-5" />}
              title="No ownership split recorded"
              description="This property is treated as 100% owned by the account holder."
            />
          ) : (
            <div className="space-y-3">
              {shares.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{s.owner.legalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.owner.isCompany ? "Company" : "Individual"}
                    </p>
                  </div>
                  <Badge tone="primary">{(s.percentageBp / 100).toFixed(0)}%</Badge>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 pt-1 text-sm">
                <span className="text-muted-foreground">Total</span>
                <span
                  className={
                    totalBp === 10000
                      ? "font-medium text-success"
                      : "font-medium text-danger"
                  }
                >
                  {(totalBp / 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
