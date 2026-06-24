"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PropertyTabs({ propertyId }: { propertyId: string }) {
  const pathname = usePathname();
  const base = `/properties/${propertyId}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/tenancies`, label: "Tenancies" },
    { href: `${base}/transactions`, label: "Transactions" },
    { href: `${base}/compliance`, label: "Compliance" },
    { href: `${base}/owners`, label: "Owners" },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors",
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
