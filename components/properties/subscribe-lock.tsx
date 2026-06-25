import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Blurs gated financial data behind a SUBSCRIBE lock badge during the trial.
 * Intentionally NON-interactive (a span, not a link) so it can sit inside a
 * card that is itself a Link without nesting anchors — upgrading happens via the
 * trial banner / subscription settings.
 */
export function SubscribeLock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none select-none opacity-50 blur-[3px]" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center" aria-hidden>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm">
          <Lock className="h-3 w-3" /> Subscribe
        </span>
      </div>
    </div>
  );
}
