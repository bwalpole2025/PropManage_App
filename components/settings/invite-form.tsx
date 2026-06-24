"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { inviteMemberAction } from "@/actions/team";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MembershipRole, MembershipRoleLabel } from "@/lib/enums";

const INVITABLE = [
  MembershipRole.ACCOUNTANT,
  MembershipRole.MANAGER,
  MembershipRole.ASSISTANT,
  MembershipRole.VIEWER,
];

export function InviteForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> Invite person
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Invite delegated access</h3>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          action={async (fd) => {
            await inviteMemberAction(fd);
            setOpen(false);
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="accountant@firm.co.uk"
              required
            />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select id="role" name="role" defaultValue={MembershipRole.ACCOUNTANT}>
              {INVITABLE.map((r) => (
                <option key={r} value={r}>
                  {MembershipRoleLabel[r]}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit">Send invite</Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Accountants get read access to finances plus the ability to categorise
          transactions, run estimates and submit MTD — but can&apos;t manage
          members or delete the account.
        </p>
      </CardContent>
    </Card>
  );
}
