import Link from "next/link";
import { Building2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { acceptInviteAction } from "@/actions/team";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MembershipRoleLabel } from "@/lib/enums";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const membership = await prisma.membership.findUnique({
    where: { inviteToken: token },
    include: { entity: true, user: true },
  });

  const invalid = !membership || membership.status !== "INVITED";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          {invalid ? (
            <>
              <CardTitle>Invite not found</CardTitle>
              <CardDescription>
                This invite link is invalid or has already been used.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle>Join {membership!.entity.displayName}</CardTitle>
              <CardDescription>
                You&apos;ve been invited as{" "}
                <Badge tone="primary">
                  {MembershipRoleLabel[
                    membership!.role as keyof typeof MembershipRoleLabel
                  ] ?? membership!.role}
                </Badge>
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {invalid ? (
            <Link href="/login">
              <Button className="w-full">Go to sign in</Button>
            </Link>
          ) : (
            <form action={acceptInviteAction} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              {membership!.user.passwordHash ? (
                <p className="text-sm text-muted-foreground">
                  You already have an account ({membership!.user.email}). Accept
                  to add this client, then sign in.
                </p>
              ) : (
                <>
                  <div>
                    <Label htmlFor="name">Your name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={[membership!.user.firstName, membership!.user.lastName].filter(Boolean).join(" ")}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Choose a password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      minLength={8}
                      required
                    />
                  </div>
                </>
              )}
              <Button type="submit" className="w-full">
                Accept invite
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
