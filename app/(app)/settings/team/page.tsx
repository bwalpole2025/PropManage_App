import { Users } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { listTeam } from "@/services/team";
import { can, Capability } from "@/lib/auth/rbac";
import { InviteForm } from "@/components/settings/invite-form";
import { RevokeButton } from "@/components/settings/revoke-button";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { MembershipRole, MembershipRoleLabel } from "@/lib/enums";

export default async function TeamPage() {
  const ctx = await getActiveContext();
  const team = await listTeam(ctx.entityId);
  const canManage = can(ctx.role, Capability.MANAGE_MEMBERS);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Team &amp; delegated access</h2>
          <p className="text-sm text-muted-foreground">
            Give your accountant or assistant access to this account.
          </p>
        </div>
        {canManage ? <InviteForm /> : null}
      </div>

      {team.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No team members"
          description="Invite an accountant to collaborate on this account."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Email</TH>
                  <TH>Role</TH>
                  <TH>Status</TH>
                  {canManage ? <TH className="text-right">Actions</TH> : null}
                </TR>
              </THead>
              <TBody>
                {team.map((m) => (
                  <TR key={m.id}>
                    <TD className="font-medium">{m.name ?? "—"}</TD>
                    <TD className="text-muted-foreground">{m.email}</TD>
                    <TD>
                      <Badge tone={m.role === "OWNER" ? "primary" : "neutral"}>
                        {MembershipRoleLabel[
                          m.role as keyof typeof MembershipRoleLabel
                        ] ?? m.role}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge
                        tone={
                          m.status === "ACTIVE"
                            ? "success"
                            : m.status === "INVITED"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {m.status}
                      </Badge>
                      {m.inviteToken ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Invite link:{" "}
                          <code className="rounded bg-muted px-1">
                            /accept-invite/{m.inviteToken}
                          </code>
                        </p>
                      ) : null}
                    </TD>
                    {canManage ? (
                      <TD className="text-right">
                        {m.role !== MembershipRole.OWNER ? (
                          <RevokeButton membershipId={m.id} />
                        ) : null}
                      </TD>
                    ) : null}
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
