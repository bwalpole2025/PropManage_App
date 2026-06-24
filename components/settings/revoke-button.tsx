"use client";

import { useTransition } from "react";
import { revokeMemberAction } from "@/actions/team";
import { Button } from "@/components/ui/button";

export function RevokeButton({ membershipId }: { membershipId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-danger hover:bg-danger/10"
      disabled={pending}
      onClick={() => startTransition(() => revokeMemberAction(membershipId))}
    >
      {pending ? "Revoking…" : "Revoke"}
    </Button>
  );
}
