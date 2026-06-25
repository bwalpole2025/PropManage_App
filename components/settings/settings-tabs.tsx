"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SettingsTabs() {
  const pathname = usePathname();
  const tabs = [
    { href: "/settings", label: "Profile" },
    { href: "/settings/organization", label: "Organisation" },
    { href: "/settings/subscription", label: "Subscription" },
    { href: "/settings/notifications", label: "Notifications" },
    { href: "/settings/banking", label: "Bank feeds" },
    { href: "/settings/team", label: "Team & access" },
    { href: "/settings/security", label: "Security" },
  ];
  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
