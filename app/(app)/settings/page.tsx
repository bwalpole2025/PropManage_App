import { getActiveContext } from "@/lib/auth/active-org";
import { prisma } from "@/lib/db";
import { fullName } from "@/lib/format";
import { UserRoleLabel, type UserRole } from "@/lib/enums";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ProfileSettingsPage() {
  const ctx = await getActiveContext();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.user.id },
    select: { firstName: true, lastName: true, email: true, role: true },
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
          <Input id="name" defaultValue={fullName(user, "")} disabled />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" defaultValue={user.email ?? ""} disabled />
        </div>
        <div>
          <Label>Role</Label>
          <div>
            <Badge tone="primary">
              {UserRoleLabel[user.role as UserRole] ?? user.role}
            </Badge>
          </div>
        </div>
        <Button disabled>Save changes (soon)</Button>
      </CardContent>
    </Card>
  );
}
