import { getActiveContext } from "@/lib/auth/active-org";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LandlordTypeLabel } from "@/lib/enums";

export default async function OrganizationSettingsPage() {
  const ctx = await getActiveContext();
  const entity = await prisma.landlordEntity.findUniqueOrThrow({
    where: { id: ctx.entityId },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organisation</CardTitle>
        <CardDescription>
          Details for {entity.displayName}. Used on your tax records and MTD
          submissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="displayName">Name</Label>
          <Input id="displayName" defaultValue={entity.displayName} disabled />
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="primary">
            {LandlordTypeLabel[entity.type as keyof typeof LandlordTypeLabel] ??
              entity.type}
          </Badge>
          {entity.mtdEnrolled ? <Badge tone="success">MTD enrolled</Badge> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="utr">Self Assessment UTR</Label>
            <Input id="utr" defaultValue={entity.utr ?? ""} disabled />
          </div>
          {entity.companyNumber ? (
            <div>
              <Label htmlFor="companyNumber">Company number</Label>
              <Input
                id="companyNumber"
                defaultValue={entity.companyNumber}
                disabled
              />
            </div>
          ) : null}
        </div>
        <Button disabled>Save changes (soon)</Button>
      </CardContent>
    </Card>
  );
}
