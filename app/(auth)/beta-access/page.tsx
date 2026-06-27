import Link from "next/link";
import { Lock } from "lucide-react";
import { LoginForm } from "../login/login-form";

// Hidden closed-beta login. Not linked from anywhere public; reachable only by
// URL. The login itself is gated by the BETA_TESTER_EMAILS allowlist (enforced
// in lib/auth `authorize` and the login action), and the middleware blocks any
// non-allowlisted session from the rest of the app with a 403.
export const metadata = {
  title: "Beta access — PropManage",
  // Keep the hidden route out of search engines.
  robots: { index: false, follow: false },
};

export default async function BetaAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;

  return (
    <div>
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
          <Lock className="h-3.5 w-3.5" />
          Closed beta
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Beta tester sign in
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Access is limited to approved beta testers.
        </p>
      </div>

      {reset ? (
        <p className="mb-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Password updated — sign in with your new password.
        </p>
      ) : null}

      <LoginForm />

      <div className="mt-3 text-right">
        <Link
          href="/forgot-password"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        PropManage is in a private closed beta. If your email isn&apos;t on the
        beta list you won&apos;t be able to sign in.
      </p>
    </div>
  );
}
