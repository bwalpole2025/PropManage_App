import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** A single sidebar navigation link with an icon, active state + left accent bar. */
export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  active = false,
  collapsed = false,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {active ? (
        <span
          className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
          aria-hidden
        />
      ) : null}
      <Icon className="h-4 w-4 shrink-0" />
      <span className={cn(collapsed && "sr-only")}>{label}</span>
    </Link>
  );
}
