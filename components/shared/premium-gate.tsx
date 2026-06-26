import * as React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Blurs premium content behind an "UNLOCK YOUR DATA" overlay while the account
 * is gated (trial / past_due / canceled). When unlocked, renders children as-is.
 * The CTA points at the subscription settings, where the user can add a payment
 * method and activate. (Non-interactive overlay aside from the single CTA link.)
 */
export function PremiumGate({
  locked,
  title = "Unlock your data",
  description = "Your data is ready — subscribe to view it.",
  cta = "Subscribe to unlock",
  className,
  children,
}: {
  locked: boolean;
  title?: string;
  description?: string;
  cta?: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (!locked) return <>{children}</>;
  return (
    <div className={cn("relative", className)}>
      <div
        className="pointer-events-none select-none opacity-40 blur-[6px]"
        aria-hidden
      >
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div className="max-w-sm rounded-lg border border-border bg-card px-6 py-5 text-center shadow-xl">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <Link
            href="/settings/subscription"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
