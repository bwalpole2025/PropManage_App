import { Building2, Lock, ShieldCheck, Sparkles } from "lucide-react";

// Public landing page for the closed beta: a professional "coming soon" banner.
// Deliberately has NO public sign-up or login controls — beta testers reach the
// app through the hidden /beta-access route, gated by the BETA_TESTER_EMAILS
// allowlist.
export function ComingSoon() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-primary px-6 py-16 text-center text-primary-foreground">
      {/* Soft background flourishes */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-primary-foreground/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-primary-foreground/10 blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
        {/* Brand */}
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Building2 className="h-6 w-6" />
          PropManage
        </div>

        {/* Closed-beta badge */}
        <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wide">
          <Lock className="h-3.5 w-3.5" />
          Closed beta — invite only
        </span>

        {/* Headline */}
        <h1 className="mt-6 text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Property management, reimagined for UK landlords.
        </h1>

        <p className="mt-5 max-w-xl text-pretty text-base text-primary-foreground/80 sm:text-lg">
          We&apos;re putting the finishing touches on PropManage — automated rent
          and expense tracking, early arrears alerts, certificate reminders and
          Making Tax Digital, all in one place. It&apos;s currently in a private,
          invite-only beta.
        </p>

        {/* Reassurance row (informational only — no auth controls) */}
        <ul className="mt-10 grid w-full gap-3 sm:grid-cols-3">
          <li className="flex flex-col items-center gap-2 rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 px-4 py-5">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">Built for the 2026 rules</span>
          </li>
          <li className="flex flex-col items-center gap-2 rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 px-4 py-5">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-medium">Compliance, handled</span>
          </li>
          <li className="flex flex-col items-center gap-2 rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 px-4 py-5">
            <Building2 className="h-5 w-5" />
            <span className="text-sm font-medium">Your whole portfolio</span>
          </li>
        </ul>

        <p className="mt-10 text-sm font-medium text-primary-foreground/70">
          Public sign-ups are closed for now. Coming soon.
        </p>
      </div>

      <footer className="relative z-10 mt-12 text-xs text-primary-foreground/50">
        © 2026 PropManage · Not yet available to the public
      </footer>
    </main>
  );
}
