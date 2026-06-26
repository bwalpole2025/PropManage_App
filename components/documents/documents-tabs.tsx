"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "documents", label: "Documents" },
  { id: "receipts", label: "Receipts" },
  { id: "reports", label: "Reports" },
  { id: "custom", label: "Custom categories" },
] as const;

/** Query-param (`?tab=`) sub-tabs for the Documents area. */
export function DocumentsTabs({
  counts,
}: {
  counts: { documents: number; receipts: number };
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const current = params.get("tab") ?? "documents";

  function go(id: string) {
    const next = new URLSearchParams(params.toString());
    if (id === "documents") next.delete("tab");
    else next.set("tab", id);
    // List filters only make sense on the document/receipt lists.
    if (id === "reports" || id === "custom") {
      next.delete("category");
      next.delete("expiry");
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map((t) => {
        const active = current === t.id;
        const badge =
          t.id === "documents"
            ? counts.documents
            : t.id === "receipts"
              ? counts.receipts
              : undefined;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => go(t.id)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {badge !== undefined ? (
              <span className="ml-1.5 text-xs text-muted-foreground">
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
