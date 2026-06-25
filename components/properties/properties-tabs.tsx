"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "properties", label: "Properties" },
  { key: "insurance", label: "Insurance" },
  { key: "mortgages", label: "Mortgages" },
];

/** Tab nav for the Properties screen — switches `?tab=` while preserving filters. */
export function PropertiesTabs({ active }: { active: string }) {
  const params = useSearchParams();
  const href = (tab: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", tab);
    return `/properties?${next.toString()}`;
  };
  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={href(t.key)}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            active === t.key
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
