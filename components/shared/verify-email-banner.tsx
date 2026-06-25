import Link from "next/link";
import { MailWarning } from "lucide-react";

/** Non-blocking nudge shown in the app shell when the user's email is unverified. */
export function VerifyEmailBanner() {
  return (
    <div className="flex items-center gap-2 border-b border-warning/40 bg-warning/10 px-6 py-2 text-sm text-warning-foreground">
      <MailWarning className="h-4 w-4 shrink-0" />
      <span>Your email isn&apos;t verified yet.</span>
      <Link
        href="/settings/security"
        className="font-medium text-primary hover:underline"
      >
        Verify now
      </Link>
    </div>
  );
}
