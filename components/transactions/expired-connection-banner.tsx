import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Banner } from "@/components/ui/banner";

/** Shown on the ledger when one or more bank consents have lapsed. */
export function ExpiredConnectionBanner({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Banner tone="warning" icon={<AlertTriangle className="h-4 w-4" />}>
      {count === 1
        ? "A bank connection's consent has expired."
        : `${count} bank connections' consent has expired.`}{" "}
      <Link href="/settings/banking" className="font-medium underline">
        Reconnect
      </Link>{" "}
      to resume importing transactions.
    </Banner>
  );
}
