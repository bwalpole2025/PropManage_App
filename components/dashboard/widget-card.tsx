import Link from "next/link";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A dashboard widget container. When `locked`, the content is dimmed/blurred
 * behind an "UNLOCK YOUR DATA" overlay that prompts the user to track data.
 */
export function WidgetCard({
  locked = false,
  lockCta = { label: "Track a transaction", href: "/transactions/new" },
  className,
  children,
}: {
  locked?: boolean;
  lockCta?: { label: string; href: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div
        className={cn(
          locked && "pointer-events-none select-none opacity-60 blur-[2px]",
        )}
        aria-hidden={locked || undefined}
      >
        {children}
      </div>
      {locked ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/60 p-6 text-center backdrop-blur-sm">
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
