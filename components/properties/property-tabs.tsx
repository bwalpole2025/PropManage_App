"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// The "Property Info" tab also owns the folded deep-link sub-routes (reached
// via "Review all" links), so it stays highlighted while on any of them.
const INFO_SUBROUTES = ["tenancies", "transactions", "compliance", "owners"];

export function PropertyTabs({ propertyId }: { propertyId: string }) {
  const pathname = usePathname();
  const base = `/properties/${propertyId}`;
  const tabs = [
    { href: base, label: "Property Info" },
    { href: `${base}/mortgages`, label: "Mortgages & Valuations" },
    { href: `${base}/epc`, label: "EPC" },
  ];

  const infoActive =
    pathname === base ||
    INFO_SUBROUTES.some((s) => pathname === `${base}/${s}`);

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const active = t.href === base ? infoActive : pathname === t.href;
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
