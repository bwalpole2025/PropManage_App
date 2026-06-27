import Link from "next/link";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A dashboard widget container.
 *
 * - When `href` is set (and the card is not locked) the whole card becomes a
 *   link to that section via a stretched overlay link. Interactive descendants
 *   (the widget's own links/buttons) are raised above the overlay so they keep
 *   working — clicking anywhere else on the card navigates to `href`.
 * - When `locked`, the content is dimmed/blurred behind an "UNLOCK YOUR DATA"
 *   overlay that prompts the user to track data (the card link is suppressed).
 */
export function WidgetCard({
  locked = false,
  lockCta = { label: "Track a transaction", href: "/transactions/new" },
  href,
  linkLabel,
  className,
  children,
}: {
  locked?: boolean;
  lockCta?: { label: string; href: string };
  /** Section the whole card links to (ignored while `locked`). */
  href?: string;
  /** Accessible label for the card link — required whenever `href` is set. */
  linkLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const linkable = !!href && !locked;
  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        linkable && "transition-colors hover:border-primary/50",
        className,
      )}
    >
      <div
        className={cn(
          // Keep the widget's own links/buttons above the stretched card link
          // so they stay clickable; everything else falls through to `href`.
          linkable &&
            "[&_a]:relative [&_a]:z-10 [&_button]:relative [&_button]:z-10",
          locked && "pointer-events-none select-none opacity-60 blur-[2px]",
        )}
        aria-hidden={locked || undefined}
      >
        {children}
      </div>

      {linkable ? (
        <Link
          href={href}
          aria-label={linkLabel ?? "Open section"}
          className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      ) : null}

      {locked ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-card/60 p-6 text-center backdrop-blur-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Unlock your data
          </p>
          <Link
            href={lockCta.href}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {lockCta.label}
          </Link>
        </div>
      ) : null}
    </Card>
  );
}
