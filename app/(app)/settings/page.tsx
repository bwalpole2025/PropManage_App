import { getActiveContext } from "@/lib/auth/active-org";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ProfileSettingsPage() {
  const ctx = await getActiveContext();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.user.id },
    select: { name: true, email: true, kind: true },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your profile</CardTitle>
        <CardDescription>
          Basic details for your login. Editing is read-only in this build.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" defaultValue={user.name ?? ""} disabled />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" defaultValue={user.email ?? ""} disabled />
        </div>
        <div>
          <Label>Account type</Label>
          <div>
            <Badge tone="primary">{user.kind}</Badge>
          </div>
        </div>
        <Button disabled>Save changes (soon)</Button>
      </CardContent>
    </Card>
  );
}
