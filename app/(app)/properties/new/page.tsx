import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { createPropertyAction } from "@/actions/property";
import { PageHeader } from "@/components/shared/page-header";
import { Forbidden } from "@/components/shared/forbidden";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PropertyType, PropertyTypeLabel } from "@/lib/enums";

export default async function NewPropertyPage() {
  const ctx = await getActiveContext();
  if (!can(ctx.role, Capability.MANAGE_PROPERTIES)) {
    return <Forbidden backHref="/properties" message="Only owners and managers can add properties." />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/properties"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to properties
      </Link>
      <PageHeader
        title="Add a property"
        description="Step 1 of replacing the spreadsheet."
      />

      <Card>
        <CardContent className="pt-5">
          <form action={createPropertyAction} className="space-y-4">
            <div>
              <Label htmlFor="addressLine1">Address line 1</Label>
              <Input id="addressLine1" name="addressLine1" required />
            </div>
            <div>
              <Label htmlFor="addressLine2">Address line 2 (optional)</Label>
              <Input id="addressLine2" name="addressLine2" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" required />
              </div>
              <div>
                <Label htmlFor="postcode">Postcode</Label>
                <Input id="postcode" name="postcode" required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="propertyType">Property type</Label>
                <Select
                  id="propertyType"
                  name="propertyType"
                  defaultValue={PropertyType.FLAT}
                >
                  {Object.values(PropertyType).map((t) => (
                    <option key={t} value={t}>
                      {PropertyTypeLabel[t]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input id="bedrooms" name="bedrooms" type="number" min="0" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit">Save property</Button>
              <Link href="/properties">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
