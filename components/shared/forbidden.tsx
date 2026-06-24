import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export function Forbidden({
  message = "You don't have permission to do this on this account.",
  backHref = "/dashboard",
}: {
  message?: string;
  backHref?: string;
}) {
  return (
    <EmptyState
      icon={<ShieldX className="h-5 w-5" />}
      title="Not allowed"
      description={message}
      action={
        <Link href={backHref}>
          <Button variant="outline">Back</Button>
        </Link>
      }
    />
  );
}
