import Link from "next/link";
import { Lock } from "lucide-react";

// Public sign-ups are disabled during the closed beta. The registration action
// also refuses (see actions/auth.ts), so this is a friendly notice rather than a
// security boundary.
export const metadata = {
  title: "Registration closed — PropManage",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        Closed beta
      </span>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Registration is closed
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        PropManage is currently in a private, invite-only closed beta, so public
        sign-ups are disabled.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        If you have been invited as a beta tester, use your beta access link to
        sign in.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
      >
        ← Back to PropManage
      </Link>
    </div>
  );
}
