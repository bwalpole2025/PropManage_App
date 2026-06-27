import Link from "next/link";
import { NAV } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";

/**
 * A grid of quick-access buttons mirroring the sidebar's top-level destinations.
 * Useful on the Overview page (and where the sidebar is hidden, e.g. small
 * screens). Derived from the shared NAV config so it stays in sync, and themed
 * with the app's green `primary` tokens.
 */
export function QuickNav({ className }: { className?: string }) {
  return (
    <section aria-labelledby="quick-nav-heading" className={cn("space-y-3", className)}>
      <h2
        id="quick-nav-heading"
        className="text-sm font-medium text-muted-foreground"
      >
        Quick access
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {NAV.map((node) => {
          const Icon = node.icon;
          return (
            <Link
              key={node.href}
              href={node.href}
              className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-foreground">
                {node.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
