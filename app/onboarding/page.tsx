import { Building2 } from "lucide-react";
import { requireUser } from "@/lib/auth/active-org";
import { createEntityAction } from "@/actions/entity";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LandlordType, LandlordTypeLabel } from "@/lib/enums";

// Shown when a logged-in user has no LandlordEntity yet. Lives OUTSIDE the
// (app) group so it never triggers the no-entity redirect loop.
export default async function OnboardingPage() {
  await requireUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <CardTitle>Create your first portfolio</CardTitle>
          <CardDescription>
            This is your account workspace. You can add properties, tenancies
            and transactions once it&apos;s created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createEntityAction} className="space-y-4">
            <div>
              <Label htmlFor="displayName">Portfolio / business name</Label>
              <Input
                id="displayName"
                name="displayName"
                placeholder="e.g. Smith Property Portfolio"
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Account type</Label>
              <Select id="type" name="type" defaultValue={LandlordType.INDIVIDUAL}>
                {Object.values(LandlordType).map((t) => (
                  <option key={t} value={t}>
                    {LandlordTypeLabel[t]}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" className="w-full">
              Create portfolio
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
